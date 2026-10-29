// Solveur d'Opération chaussette : cherche un parcours qui vole toutes les chaussettes et revient
// au panier sans jamais entrer dans un champ de vision (avec une marge de prudence).
// Sert à vérifier les niveaux (tools/check-chaussette.mjs) et au pilote automatique de test (?bot).
import { parseLevel, guardPose, sees, TALYA_SPEED } from './world.js';

export const DT = (1 / TALYA_SPEED) * 1.08;
const HORIZON = 150;
export const MARGIN = 0.45;
const SUB = [0.25, 0.5, 0.75, 1];

// scale > 1 : on agrandit la portée et l'angle de vision pour mesurer la difficulté (outil uniquement).
export function solve(L, margin = MARGIN, scale = 1) {
  const world = parseLevel(L);
  if (scale !== 1) world.guards = world.guards.map(g => ({ ...g, range: g.range * scale, fov: Math.min(Math.PI * 1.6, g.fov * scale) }));
  const { w, h } = world;
  const seen = (x, y, t) => world.guards.some(g => sees(world, g, guardPose(g, t), x, y, margin));
  for (const g of world.guards) for (let t = 0; t < g.period; t += 0.1) {
    const p = guardPose(g, t);
    if (world.blocked(Math.floor(p.x), Math.floor(p.y)) || world.hide(Math.floor(p.x), Math.floor(p.y))) return { ok: false, why: `garde dans un obstacle en (${p.x.toFixed(1)}, ${p.y.toFixed(1)})` };
  }
  const steps = Math.ceil(HORIZON / DT);
  const S = world.socks.length, FULL = (1 << S) - 1, M = FULL + 1;
  const sockAt = new Map(world.socks.map(([x, y], k) => [y * w + x, k]));
  const N = w * h;
  const vis = new Uint8Array(N * (steps + 1) * M);
  const par = new Int32Array(N * (steps + 1) * M).fill(-1);
  const idx = (c, s, m) => (s * N + c) * M + m;
  const [sx, sy] = world.start;
  if (seen(sx + 0.5, sy + 0.5, 0)) return { ok: false, why: 'Talya est vue dès le départ' };
  let frontier = [[sy * w + sx, 0]];
  vis[idx(sy * w + sx, 0, 0)] = 1;
  for (let s = 0; s < steps; s++) {
    const t = (s + 1) * DT;
    const next = [];
    for (const [c, m] of frontier) {
      const cx = c % w, cy = Math.floor(c / w);
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (world.blocked(nx, ny)) continue;
        // on vérifie tout le trajet, pas seulement ses extrémités : un garde qui tourne vite la tête
        // peut balayer une case entre deux instants trop espacés
        let spotted = false;
        for (const f of SUB) if (seen(cx + 0.5 + dx * f, cy + 0.5 + dy * f, t - DT + DT * f)) { spotted = true; break; }
        if (spotted) continue;
        const nc = ny * w + nx;
        let nm = m;
        if (sockAt.has(nc)) nm |= 1 << sockAt.get(nc);
        const k = idx(nc, s + 1, nm);
        if (vis[k]) continue;
        vis[k] = 1;
        par[k] = idx(c, s, m);
        if (nm === FULL && nx === sx && ny === sy) {
          const path = [];
          for (let q = k; q !== -1; q = par[q]) { const cell = Math.floor(q / M) % N; path.push([cell % w, Math.floor(cell / w)]); }
          return { ok: true, time: t, path: path.reverse(), socks: S, guards: world.guards.length };
        }
        next.push([nc, nm]);
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return { ok: false, why: 'aucun chemin sans être vue en ' + HORIZON + ' s' };
}
