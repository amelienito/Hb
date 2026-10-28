// Moteur pur d'Opération chaussette : carte, patrouilles, vision. Aucun accès au DOM,
// pour que le jeu et le solveur (tools/check-chaussette.mjs) partagent exactement les mêmes règles.
//
// Légende des cartes
//   #  mur (bloque tout)          .  sol           ,  tapis (sol décoratif)
//   t  table : Talya passe dessous et y est invisible
//   b  lit : idem
//   s  canapé : bloque le passage, pas la vue      p  plante : idem
//   k  plan de travail, w  armoire : bloquent le passage et la vue
//   c  chaussette à voler          D  panier de Talya (départ et arrivée)

export const SOLID = new Set(['#', 's', 'p', 'k', 'w']);
export const OPAQUE = new Set(['#', 'k', 'w']);
export const HIDE = new Set(['t', 'b']);

export const TALYA_SPEED = 2.9;   // cases par seconde
export const TALYA_R = 0.3;

export function parseLevel(L) {
  const h = L.map.length, w = L.map[0].length;
  const tiles = [];
  const socks = [];
  let start = null;
  for (let y = 0; y < h; y++) {
    if (L.map[y].length !== w) throw new Error(`${L.name} : ligne ${y} de longueur ${L.map[y].length}`);
    for (let x = 0; x < w; x++) {
      let c = L.map[y][x];
      if (c === 'c') { socks.push([x, y]); c = '.'; }
      if (c === 'D') { start = [x, y]; c = 'D'; }
      tiles.push(c);
    }
  }
  const world = { w, h, tiles, socks, start, name: L.name };
  world.at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? '#' : tiles[y * w + x]);
  world.solid = (x, y) => SOLID.has(world.at(x, y));
  world.opaque = (x, y) => OPAQUE.has(world.at(x, y));
  world.hide = (x, y) => HIDE.has(world.at(x, y));
  world.guards = (L.guards || []).map(g => buildGuard(g));
  return world;
}

// Une patrouille : des points de passage, une vitesse, une pause à chaque point
// pendant laquelle le regard pivote vers la direction suivante.
function buildGuard(def) {
  const look = { kind: def.kind || 'human', skin: def.skin || '#e2b998', range: def.range || 4.5, fov: ((def.fov || 70) * Math.PI) / 180, phase: def.phase || 0, name: def.name || 'Florian', hair: def.hair || '#3a2a20', shirt: def.shirt || '#c0533b' };
  if (def.scan) {
    // garde immobile qui tourne la tête d'un angle à l'autre
    const at = [def.at[0] + 0.5, def.at[1] + 0.5];
    const A = def.scan.map(d => (d * Math.PI) / 180);
    const segs = [];
    let t = 0;
    for (let i = 0; i < A.length; i++) {
      const from = A[i], to = A[(i + 1) % A.length];
      segs.push({ kind: 'turn', t0: t, t1: t + (def.hold || 2), at, from, to: from });
      t += def.hold || 2;
      segs.push({ kind: 'turn', t0: t, t1: t + (def.turn || 1), at, from, to, fast: true });
      t += def.turn || 1;
    }
    return { segs, period: t, ...look };
  }
  const pts = def.path.map(([x, y]) => [x + 0.5, y + 0.5]);
  let route = pts;
  if (def.mode !== 'loop') route = pts.concat(pts.slice(1, -1).reverse());
  const speed = def.speed || 1.3, pause = def.pause == null ? 1.4 : def.pause;
  const segs = [];
  let t = 0;
  for (let i = 0; i < route.length; i++) {
    const a = route[i], b = route[(i + 1) % route.length], c = route[(i + 2) % route.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dur = len / speed;
    const head = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const next = Math.atan2(c[1] - b[1], c[0] - b[0]);
    segs.push({ kind: 'move', t0: t, t1: t + dur, a, b, head });
    t += dur;
    const p = (def.pauses && def.pauses[i]) != null ? def.pauses[i] : pause;
    segs.push({ kind: 'turn', t0: t, t1: t + p, at: b, from: head, to: next, look: def.look || 0 });
    t += p;
  }
  return { segs, period: t, glance: def.glance || 0, ...look };
}

function angLerp(a, b, f) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return a + d * f;
}

export function guardPose(g, t) {
  const tt = (((t + g.phase) % g.period) + g.period) % g.period;
  for (const s of g.segs) {
    if (tt < s.t0 || tt >= s.t1) continue;
    const f = (tt - s.t0) / Math.max(1e-6, s.t1 - s.t0);
    if (s.kind === 'move') {
      // coup d'œil par-dessus l'épaule à intervalle régulier (le côté alterne)
      let a = s.head;
      if (g.glance) {
        const ph = tt % g.glance;
        if (ph < 1.1) a += Math.sin((ph / 1.1) * Math.PI) * 2.3 * (Math.floor(tt / g.glance) % 2 ? 1 : -1);
      }
      return { x: s.a[0] + (s.b[0] - s.a[0]) * f, y: s.a[1] + (s.b[1] - s.a[1]) * f, a, moving: true };
    }
    // pivot doux : on regarde encore un peu devant, puis on se retourne
    const e = s.fast ? f : f < 0.35 ? 0 : (f - 0.35) / 0.65;
    const ease = e * e * (3 - 2 * e);
    return { x: s.at[0], y: s.at[1], a: angLerp(s.from, s.to, ease), moving: false };
  }
  const s = g.segs[g.segs.length - 1];
  return { x: s.at[0], y: s.at[1], a: s.to, moving: false };
}

// Le point (px, py) est-il dans le champ de vision de ce garde ?
export function sees(world, g, pose, px, py, margin = 0) {
  if (world.hide(Math.floor(px), Math.floor(py))) return false;
  const dx = px - pose.x, dy = py - pose.y;
  const d = Math.hypot(dx, dy);
  if (d > g.range + margin) return false;
  if (d > 0.55) {
    let da = Math.atan2(dy, dx) - pose.a;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    if (Math.abs(da) > g.fov / 2 + margin * 0.15) return false;
  }
  return lineOfSightClear(world, pose.x, pose.y, px, py);
}

export function lineOfSightClear(world, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.ceil(Math.hypot(dx, dy) * 5);
  for (let k = 1; k < n; k++) {
    const px = x0 + (dx * k) / n, py = y0 + (dy * k) / n;
    if (world.opaque(Math.floor(px), Math.floor(py))) return false;
  }
  return true;
}

// Polygone du cône de vision, coupé par les murs (pour l'affichage).
export function visionPolygon(world, g, pose, rays = 36) {
  const pts = [[pose.x, pose.y]];
  for (let k = 0; k <= rays; k++) {
    const a = pose.a - g.fov / 2 + (g.fov * k) / rays;
    const cx = Math.cos(a), cy = Math.sin(a);
    let d = 0;
    const step = 0.05;
    while (d < g.range) {
      const nx = pose.x + cx * (d + step), ny = pose.y + cy * (d + step);
      if (world.opaque(Math.floor(nx), Math.floor(ny))) break;
      d += step;
    }
    pts.push([pose.x + cx * d, pose.y + cy * d]);
  }
  return pts;
}
