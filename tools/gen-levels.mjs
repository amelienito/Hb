// Génère les niveaux de Réacteur et vérifie qu'ils sont tous faisables.
// Usage : node tools/gen-levels.mjs   (réécrit src/games/reacteur/levels.js)
import { parse, trace, solve } from '../src/games/reacteur/engine.js';
import { writeFileSync } from 'node:fs';

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPECS = [
  { w: 5, h: 6, mirrors: 2, targets: 1, walls: 1, par: [1, 2], maxSols: 1 },
  { w: 5, h: 6, mirrors: 3, targets: 2, walls: 2, par: [2, 3], maxSols: 1 },
  { w: 6, h: 7, mirrors: 4, targets: 2, walls: 3, par: [3, 4], maxSols: 1 },
  { w: 6, h: 7, mirrors: 3, sockets: 1, targets: 2, walls: 3, par: [2, 5], maxSols: 2, needSocket: true },
  { w: 6, h: 8, mirrors: 3, balls: 1, targets: 3, walls: 3, par: [3, 5], maxSols: 1 },
  { w: 6, h: 8, mirrors: 4, alarms: 2, targets: 2, walls: 3, par: [3, 5], maxSols: 1, alarmStart: true },
  { c: true, w: 6, h: 8, pathMirrors: 4, sockets: 1, decoys: 1, alarms: 1, targets: 3, walls: 3, par: [4, 6], maxSols: 2 },
  { c: true, w: 7, h: 8, pathMirrors: 4, balls: 1, sockets: 1, decoys: 1, alarms: 2, targets: 3, walls: 4, par: [4, 7], maxSols: 2 },
  { c: true, w: 7, h: 9, pathMirrors: 5, sockets: 2, fixed: 1, decoys: 2, alarms: 2, targets: 3, walls: 4, par: [5, 8], maxSols: 2 },
  { c: true, w: 7, h: 9, pathMirrors: 5, balls: 1, sockets: 2, decoys: 2, alarms: 2, targets: 4, walls: 4, par: [5, 9], maxSols: 2 },
  { c: true, w: 7, h: 9, pathMirrors: 6, balls: 1, sockets: 2, fixed: 1, decoys: 2, alarms: 3, targets: 4, walls: 5, par: [6, 10], maxSols: 2 },
  { c: true, w: 7, h: 9, pathMirrors: 7, balls: 2, sockets: 2, decoys: 2, alarms: 3, targets: 5, walls: 5, par: [7, 12], maxSols: 2 },
];

// Génération constructive : on fait avancer le faisceau et on pose les pièces sur son trajet.
function attemptC(spec, R) {
  const { w, h } = spec, N = w * h;
  const grid = new Array(N).fill('.');   // niveau final (miroirs à orienter)
  const sol = new Array(N).fill(null);    // orientation solution
  const idx = (x, y) => y * w + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;

  const side = Math.floor(R() * 4);
  let ex, ey, dx, dy, ch;
  if (side === 0) { ex = 0; ey = 1 + Math.floor(R() * (h - 2)); dx = 1; dy = 0; ch = '>'; }
  else if (side === 1) { ex = w - 1; ey = 1 + Math.floor(R() * (h - 2)); dx = -1; dy = 0; ch = '<'; }
  else if (side === 2) { ey = 0; ex = 1 + Math.floor(R() * (w - 2)); dx = 0; dy = 1; ch = 'v'; }
  else { ey = h - 1; ex = 1 + Math.floor(R() * (w - 2)); dx = 0; dy = -1; ch = '^'; }
  grid[idx(ex, ey)] = ch;

  const traversed = new Set([idx(ex, ey)]);
  const pathEmpty = [];
  const pool = [];
  for (let k = 0; k < spec.pathMirrors; k++) pool.push('m');
  for (let k = 0; k < (spec.sockets || 0); k++) pool.push('s');
  for (let k = 0; k < (spec.balls || 0); k++) pool.push('b');
  // mélange, mais pas de balle en tout premier
  for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(R() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
  if (pool[0] === 'b') { const j = pool.findIndex(p => p !== 'b'); [pool[0], pool[j]] = [pool[j], pool[0]]; }

  const beams = [{ x: ex, y: ey, dx, dy }];
  const pathPieces = [];
  let guard = 0;
  while (beams.length && guard++ < 60) {
    const b = beams.shift();
    let { x, y } = b; let bdx = b.dx, bdy = b.dy;
    for (;;) {
      if (!pool.length) {
        // plus de pièces : on file tout droit jusqu'au bord ou à un obstacle
        for (;;) {
          const nx = x + bdx, ny = y + bdy;
          if (!inside(nx, ny) || grid[idx(nx, ny)] !== '.') break;
          x = nx; y = ny;
          if (!traversed.has(idx(x, y))) pathEmpty.push(idx(x, y));
          traversed.add(idx(x, y));
        }
        break;
      }
      const opts = [];
      for (let run = 0; run <= 3; run++) {
        let cx = x, cy = y, good = true;
        for (let s = 0; s < run; s++) { cx += bdx; cy += bdy; if (!inside(cx, cy) || grid[idx(cx, cy)] !== '.') { good = false; break; } }
        if (!good) break;
        const px = cx + bdx, py = cy + bdy;
        if (!inside(px, py) || grid[idx(px, py)] !== '.' || traversed.has(idx(px, py))) continue;
        for (const left of [true, false]) {
          const ndx = left ? bdy : -bdy, ndy = left ? -bdx : bdx;
          if (!inside(px + ndx, py + ndy) || grid[idx(px + ndx, py + ndy)] !== '.') continue;
          opts.push({ run, px, py, ndx, ndy });
        }
      }
      if (!opts.length) break;
      const o = opts[Math.floor(R() * opts.length)];
      for (let s = 0; s < o.run; s++) {
        x += bdx; y += bdy;
        const ci = idx(x, y);
        if (!traversed.has(ci)) pathEmpty.push(ci);
        traversed.add(ci);
      }
      const kind = pool.shift();
      const pi = idx(o.px, o.py);
      x = o.px; y = o.py; traversed.add(pi); pathPieces.push(pi);
      if (kind === 'b') {
        grid[pi] = 'B';
        beams.push({ x, y, dx: bdy, dy: bdx }, { x, y, dx: -bdy, dy: -bdx });
        break;
      }
      const k = (o.ndx === -bdy && o.ndy === -bdx) ? '/' : '\\';
      grid[pi] = kind === 's' ? 'o' : '/';
      sol[pi] = k;
      bdx = o.ndx; bdy = o.ndy;
    }
  }
  if (pool.length) return null;

  // miroirs fixes : quelques miroirs du trajet deviennent fixes
  const pathMirrors = pathPieces.filter(i => grid[i] === '/');
  for (let k = 0; k < (spec.fixed || 0) && k < pathMirrors.length; k++) {
    const i = pathMirrors[Math.floor(R() * pathMirrors.length)];
    if (grid[i] !== '/') continue;
    grid[i] = sol[i] === '/' ? 'F' : 'G';
  }

  const freeCells = () => { const a = []; for (let i = 0; i < N; i++) if (grid[i] === '.' && !traversed.has(i)) a.push(i); return a; };
  const takeFree = () => { const a = freeCells(); return a.length ? a[Math.floor(R() * a.length)] : -1; };
  for (let k = 0; k < (spec.decoys || 0); k++) { const i = takeFree(); if (i < 0) return null; grid[i] = '/'; sol[i] = R() < 0.5 ? '/' : '\\'; }
  for (let k = 0; k < (spec.walls || 0); k++) { const i = takeFree(); if (i < 0) return null; grid[i] = '#'; }

  // cœurs sur le trajet, plutôt vers la fin
  if (pathEmpty.length < spec.targets + 2) return null;
  const tail = pathEmpty.slice(Math.floor(pathEmpty.length * 0.3));
  const chosen = new Set();
  let g2 = 0;
  while (chosen.size < spec.targets && g2++ < 200) chosen.add(tail[Math.floor(R() * tail.length)]);
  if (chosen.size < spec.targets) return null;
  for (const i of chosen) grid[i] = 'T';

  const solRows = () => toRows(grid.map((c, i) => (sol[i] && (c === '/' || c === 'o') ? sol[i] : c)), w, h);
  let gs = parse(solRows());
  let tr = trace(gs);
  if (!tr.solved) return null;

  if (spec.alarms) {
    const counts = new Map();
    for (let s = 0; s < 80; s++) {
      const alt = grid.map(c => (c === '/' ? (R() < 0.5 ? '/' : '\\') : c === 'o' ? ['o', '/', '\\'][Math.floor(R() * 3)] : c));
      const t2 = trace(parse(toRows(alt, w, h)));
      for (const i of t2.visited) if (grid[i] === '.' && !tr.visited.has(i)) counts.set(i, (counts.get(i) || 0) + 1);
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
    if (ranked.length < spec.alarms) return null;
    for (let k = 0; k < spec.alarms; k++) grid[ranked[k]] = 'A';
    if (!trace(parse(solRows())).solved) return null;
  }

  let res = null, start, sg;
  for (let tries = 0; tries < 16; tries++) {
    start = grid.map(c => (c === '/' ? (R() < 0.5 ? '/' : '\\') : c));
    sg = parse(toRows(start, w, h));
    const t0 = trace(sg);
    if (t0.solved || t0.lit.size > Math.floor(spec.targets / 2)) continue;
    // un miroir leurre hors trajet double le nombre de solutions sans changer la difficulté
    const cap = spec.maxSols * 2 ** (spec.decoys || 0);
    res = solve(sg, cap);
    if (res.sols >= 1 && res.sols <= cap && res.par >= spec.par[0] && res.par <= spec.par[1]) break;
    res = null;
  }
  if (!res) return null;
  const score = res.par * 3 - res.sols * 2 + pathPieces.length;
  return { rows: toRows(start, w, h), par: res.par, sols: res.sols, score };
}

const NAMES = [
  'Premier contact', 'Double détente', 'Court-circuit', 'Le socle', 'La balle', 'Capteurs',
  'Ronde de nuit', 'Effet domino', 'Sous tension', 'Fourche', 'Haute fréquence', 'Mark 30',
];

function toRows(grid, w, h) {
  const rows = [];
  for (let y = 0; y < h; y++) rows.push(grid.slice(y * w, y * w + w).join(''));
  return rows;
}

function attempt(spec, R) {
  const { w, h } = spec;
  const N = w * h;
  const grid = new Array(N).fill('.');
  const pick = () => Math.floor(R() * N);
  const free = i => grid[i] === '.';
  const idx = (x, y) => y * w + x;

  // émetteur sur un bord, tourné vers l'intérieur
  const side = Math.floor(R() * 4);
  let ex, ey, ch;
  if (side === 0) { ex = 0; ey = 1 + Math.floor(R() * (h - 2)); ch = '>'; }
  else if (side === 1) { ex = w - 1; ey = 1 + Math.floor(R() * (h - 2)); ch = '<'; }
  else if (side === 2) { ey = 0; ex = 1 + Math.floor(R() * (w - 2)); ch = 'v'; }
  else { ey = h - 1; ex = 1 + Math.floor(R() * (w - 2)); ch = '^'; }
  grid[idx(ex, ey)] = ch;
  const front = { '>': idx(ex + 1, ey), '<': idx(ex - 1, ey), 'v': idx(ex, ey + 1), '^': idx(ex, ey - 1) }[ch];
  const reserved = new Set([front]);

  const place = (n, c) => {
    for (let k = 0; k < n; k++) {
      let i, guard = 0;
      do { i = pick(); } while ((!free(i) || reserved.has(i)) && guard++ < 200);
      if (guard >= 200) return false;
      grid[i] = c;
    }
    return true;
  };
  if (!place(spec.walls || 0, '#')) return null;
  if (!place(spec.balls || 0, 'B')) return null;
  if (!place(spec.fixed || 0, R() < 0.5 ? 'F' : 'G')) return null;
  if (!place(spec.mirrors, '/')) return null;
  if (!place(spec.sockets || 0, 'o')) return null;

  // état « solution » aléatoire
  const solGrid = grid.map(c => {
    if (c === '/') return R() < 0.5 ? '/' : '\\';
    if (c === 'o') return R() < 0.85 ? (R() < 0.5 ? '/' : '\\') : 'o';
    return c;
  });
  let g = parse(toRows(solGrid, w, h));
  let tr = trace(g);

  // la plupart des pièces doivent servir
  const movable = g.mut.length + (spec.balls || 0);
  let onPath = 0;
  for (const i of g.mut) if (tr.visited.has(i)) onPath++;
  for (let i = 0; i < N; i++) if (solGrid[i] === 'B' && tr.visited.has(i)) onPath++;
  if (onPath < Math.ceil(movable * 0.7)) return null;
  if (spec.balls) { for (let i = 0; i < N; i++) if (solGrid[i] === 'B' && !tr.visited.has(i)) return null; }
  if (spec.needSocket) {
    // un socle doit porter un miroir utile dans la solution
    let ok = false;
    for (let i = 0; i < N; i++) if (grid[i] === 'o' && solGrid[i] !== 'o' && tr.visited.has(i)) ok = true;
    if (!ok) return null;
  }

  // cœurs : cases vides traversées, plutôt en fin de parcours
  const emptyVisited = [...tr.visited].filter(i => solGrid[i] === '.' && i !== front);
  if (emptyVisited.length < spec.targets + 2) return null;
  const tail = emptyVisited.slice(Math.floor(emptyVisited.length * 0.35));
  const chosen = new Set();
  let guard = 0;
  while (chosen.size < spec.targets && guard++ < 100) chosen.add(tail[Math.floor(R() * tail.length)]);
  if (chosen.size < spec.targets) return null;
  for (const i of chosen) { solGrid[i] = 'T'; grid[i] = 'T'; }

  // alarmes : cases non traversées dans la solution mais souvent touchées ailleurs
  if (spec.alarms) {
    const counts = new Map();
    for (let s = 0; s < 60; s++) {
      const alt = grid.map(c => (c === '/' ? (R() < 0.5 ? '/' : '\\') : c === 'o' ? ['o', '/', '\\'][Math.floor(R() * 3)] : c));
      const t2 = trace(parse(toRows(alt, w, h)));
      for (const i of t2.visited) if (solGrid[i] === '.' && !tr.visited.has(i)) counts.set(i, (counts.get(i) || 0) + 1);
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
    if (ranked.length < spec.alarms) return null;
    for (let k = 0; k < spec.alarms; k++) { solGrid[ranked[k]] = 'A'; grid[ranked[k]] = 'A'; }
  }

  g = parse(toRows(solGrid, w, h));
  if (!trace(g).solved) return null;

  // état de départ : miroirs au hasard, socles vides
  let start, sg, res;
  for (let tries = 0; tries < 12; tries++) {
    start = grid.map(c => (c === '/' ? (R() < 0.5 ? '/' : '\\') : c));
    sg = parse(toRows(start, w, h));
    const t0 = trace(sg);
    if (t0.solved) continue;
    if (spec.alarmStart && t0.alarmHit.size === 0) continue;
    res = solve(sg, spec.maxSols);
    if (res.sols >= 1 && res.sols <= spec.maxSols && res.par >= spec.par[0] && res.par <= spec.par[1]) break;
    res = null;
  }
  if (!res) return null;
  const lit0 = trace(sg).lit.size;
  const score = onPath * 3 + res.par * 2 - lit0 * 2 + (spec.targets - lit0);
  return { rows: toRows(start, w, h), par: res.par, sols: res.sols, score };
}

const out = [];
SPECS.forEach((spec, n) => {
  const R = rng(1000 + n * 7919);
  let best = null, found = 0;
  const t0 = Date.now();
  for (let a = 0; a < 400000 && found < (spec.c ? 12 : 40) && Date.now() - t0 < 45000; a++) {
    const r = spec.c ? attemptC(spec, R) : attempt(spec, R);
    if (r) { found++; if (!best || r.score > best.score) best = r; }
  }
  if (!best) { console.error('Aucun niveau pour la spec', n + 1); process.exit(1); }
  out.push({ name: NAMES[n], rows: best.rows, par: best.par });
  console.log(`\n${n + 1}. ${NAMES[n]}  par ${best.par}  (candidats ${found})`);
  console.log(best.rows.join('\n'));
});

const src = '// Fichier généré par tools/gen-levels.mjs. Chaque niveau est vérifié faisable.\n' +
  'export const LEVELS = ' + JSON.stringify(out, null, 1) + ';\n';
writeFileSync(new URL('../src/games/reacteur/levels.js', import.meta.url), src);
console.log('\nOK : ' + out.length + ' niveaux écrits');
