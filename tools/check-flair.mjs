// Vérifie que chaque affaire de Flair se génère, que chaque objet est atteignable à pied,
// et affiche la carte. Usage : node tools/check-flair.mjs [numéro]
import { CASES, buildCase } from '../src/games/flair/world.js';
import { astar } from '../src/core/topdown.js';

const only = process.argv[2] ? [Number(process.argv[2]) - 1] : CASES.map((_, i) => i);
let ok = true;
for (const i of only) {
  const c = CASES[i];
  const W = buildCase(c);
  if (!W) { console.log(`${i + 1}. ${c.name} : ÉCHEC de génération (graine ${c.seed})`); ok = false; continue; }
  const cost = (x, y) => (W.solid(x, y) ? Infinity : 1);
  const reach = W.objects.map(o => !!astar(W.w, W.h, cost, W.start[0], W.start[1], o.at[0], o.at[1]));
  const gaps = W.trails[0].dry.filter(d => !d).length * 0.25;
  console.log(`\n${i + 1}. ${c.name}  ${W.w}x${W.h}  piste ${W.length.toFixed(1)} cases, ${W.trails.length - 1} fausse(s) piste(s), ${gaps.toFixed(1)} cases sans odeur, objets atteignables : ${reach.every(Boolean) ? 'oui' : 'NON'}`);
  if (!reach.every(Boolean)) ok = false;
  const grid = [];
  for (let y = 0; y < W.h; y++) { let row = ''; for (let x = 0; x < W.w; x++) row += W.at(x, y); grid.push(row.split('')); }
  for (const [x, y] of W.trails[0].pts) if (grid[Math.floor(y)][Math.floor(x)] !== 'T') grid[Math.floor(y)][Math.floor(x)] = '*';
  W.trails.slice(1).forEach((t, k) => { for (const [x, y] of t.pts) if (grid[Math.floor(y)][Math.floor(x)] !== '*') grid[Math.floor(y)][Math.floor(x)] = String(k + 1); });
  W.objects.forEach(o => { grid[o.at[1]][o.at[0]] = o.real ? 'X' : 'x'; });
  grid[W.start[1]][W.start[0]] = 'S';
  if (process.argv[2]) console.log(grid.map(r => r.join('')).join('\n'));
}
process.exit(ok ? 0 : 1);
