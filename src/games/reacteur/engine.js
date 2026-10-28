// Moteur pur de Réacteur : lecture d'un niveau, tracé du faisceau, solveur.
// Aucun accès au DOM : le même fichier sert au jeu et aux outils de génération.
//
// Légende des niveaux
//   .  vide          #  mur            T  cœur à allumer (le faisceau le traverse)
//   B  balle (divise le faisceau en deux, à angle droit)
//   A  capteur d'alarme (le toucher fait échouer le niveau)
//   /  \  miroirs que l'on fait pivoter
//   o  socle vide (accepte un miroir : vide → / → \ → vide)
//   F  G  miroirs fixes ( / et \ )
//   > < ^ v  émetteur et sa direction

const EMIT = { '>': [1, 0], '<': [-1, 0], '^': [0, -1], 'v': [0, 1] };

export function parse(rows) {
  const h = rows.length, w = rows[0].length;
  const cells = [], emitters = [], mut = [], targets = [], alarms = [];
  for (let y = 0; y < h; y++) {
    if (rows[y].length !== w) throw new Error('ligne ' + y + ' de longueur différente');
    for (let x = 0; x < w; x++) {
      const c = rows[y][x], i = y * w + x;
      let cell;
      switch (c) {
        case '.': cell = { t: 'empty' }; break;
        case '#': cell = { t: 'wall' }; break;
        case 'T': cell = { t: 'target' }; targets.push(i); break;
        case 'B': cell = { t: 'ball' }; break;
        case 'A': cell = { t: 'alarm' }; alarms.push(i); break;
        case '/': cell = { t: 'mirror', s: 0 }; break;
        case '\\': cell = { t: 'mirror', s: 1 }; break;
        case 'o': cell = { t: 'socket', s: 0 }; break;
        case 'F': cell = { t: 'fixed', s: 0 }; break;
        case 'G': cell = { t: 'fixed', s: 1 }; break;
        default:
          if (EMIT[c]) {
            const [dx, dy] = EMIT[c];
            cell = { t: 'emitter', dx, dy };
            emitters.push({ x, y, dx, dy });
          } else throw new Error('caractère inconnu : ' + c);
      }
      cells.push(cell);
      if (cell.t === 'mirror' || cell.t === 'socket') mut.push(i);
    }
  }
  return { w, h, cells, emitters, mut, targets, alarms };
}

// 0 = '/', 1 = '\', null = pas de miroir
export function mirrorKind(cell) {
  if (cell.t === 'mirror' || cell.t === 'fixed') return cell.s;
  if (cell.t === 'socket') return cell.s === 0 ? null : cell.s - 1;
  return null;
}

function dirIndex(dx, dy) { return dx === 1 ? 0 : dx === -1 ? 1 : dy === -1 ? 2 : 3; }

// Renvoie les tracés (listes de points en coordonnées de cases), les cœurs allumés,
// les alarmes touchées et toutes les cases traversées.
export function trace(g) {
  const { w, h, cells } = g;
  const seen = new Set(), lit = new Set(), alarmHit = new Set(), visited = new Set();
  // distance du premier passage du faisceau sur chaque cœur et chaque alarme
  const litDist = new Map(), alarmDist = new Map();
  let maxDist = 0;
  const paths = [];
  // offsets[k] = distance (en cases) depuis l'émetteur au début du tracé k, pour l'animation
  const offsets = [];
  const stack = g.emitters.map(e => ({ x: e.x, y: e.y, dx: e.dx, dy: e.dy, pts: [[e.x, e.y]], d0: 0 }));
  let safety = 0;
  while (stack.length && safety++ < 400) {
    const b = stack.pop();
    let { x, y, dx, dy } = b;
    const pts = b.pts;
    const d0 = b.d0;
    let run = 0;
    for (;;) {
      run++;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) { pts.push([x + dx * 0.5, y + dy * 0.5]); maxDist = Math.max(maxDist, d0 + run); break; }
      x = nx; y = ny;
      const i = y * w + x, c = cells[i];
      const key = i * 4 + dirIndex(dx, dy);
      if (seen.has(key)) { pts.push([x, y]); maxDist = Math.max(maxDist, d0 + run); break; }
      seen.add(key);
      visited.add(i);
      if (c.t === 'wall' || c.t === 'emitter') { pts.push([x - dx * 0.5, y - dy * 0.5]); maxDist = Math.max(maxDist, d0 + run); break; }
      if (c.t === 'alarm') { alarmHit.add(i); if (!alarmDist.has(i)) alarmDist.set(i, d0 + run); pts.push([x, y]); maxDist = Math.max(maxDist, d0 + run); break; }
      if (c.t === 'target') { lit.add(i); if (!litDist.has(i)) litDist.set(i, d0 + run); continue; }
      if (c.t === 'ball') {
        pts.push([x, y]);
        stack.push({ x, y, dx: dy, dy: dx, pts: [[x, y]], d0: d0 + run });
        stack.push({ x, y, dx: -dy, dy: -dx, pts: [[x, y]], d0: d0 + run });
        break;
      }
      const k = mirrorKind(c);
      if (k !== null) {
        pts.push([x, y]);
        if (k === 0) { const t = dx; dx = -dy; dy = -t; } else { const t = dx; dx = dy; dy = t; }
      }
    }
    paths.push(pts);
    offsets.push(d0);
  }
  const solved = g.targets.every(i => lit.has(i)) && alarmHit.size === 0;
  return { paths, offsets, lit, alarmHit, visited, solved, litDist, alarmDist, maxDist };
}

export function isSolved(g) { return trace(g).solved; }

// Parcourt tous les états possibles des pièces mobiles.
// par = nombre minimal de touches depuis l'état de départ.
export function solve(g, maxSols = Infinity) {
  const m = g.mut;
  const base = m.map(i => g.cells[i].s);
  const radix = m.map(i => (g.cells[i].t === 'socket' ? 3 : 2));
  const total = radix.reduce((a, b) => a * b, 1);
  let sols = 0, par = Infinity, best = null;
  for (let n = 0; n < total; n++) {
    let r = n, taps = 0;
    for (let j = 0; j < m.length; j++) {
      const v = r % radix[j];
      r = (r - v) / radix[j];
      g.cells[m[j]].s = v;
      taps += radix[j] === 2 ? (v !== base[j] ? 1 : 0) : (v - base[j] + 3) % 3;
    }
    if (isSolved(g)) {
      sols++;
      if (taps < par) { par = taps; best = m.map(i => g.cells[i].s); }
      if (sols > maxSols) break;
    }
  }
  m.forEach((i, j) => { g.cells[i].s = base[j]; });
  return { sols, par, best };
}
