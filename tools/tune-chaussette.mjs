// Cherche des réglages de patrouille pour qu'un niveau soit « technique mais faisable » :
// faisable tel quel ET avec une vision agrandie de lo, mais impossible avec une vision agrandie de hi.
// Usage : node tools/tune-chaussette.mjs <niveau> <lo> <hi> [essais]
import { solve } from '../src/games/chaussette/solver.js';
import { LEVELS } from '../src/games/chaussette/levels.js';
import { rng } from '../src/core/topdown.js';

const n = Number(process.argv[2]) - 1, lo = Number(process.argv[3]), hi = Number(process.argv[4]), tries = Number(process.argv[5] || 40);
const base = LEVELS[n];
const R = rng(n * 977 + 13);
const pick = a => a[Math.floor(R() * a.length)];
let found = null;
for (let k = 0; k < tries && !found; k++) {
  const guards = base.guards.map(g => {
    const o = { ...g };
    if (g.scan) { o.hold = +(g.hold * (0.7 + R() * 0.5)).toFixed(2); o.turn = +(g.turn * (0.7 + R() * 0.5)).toFixed(2); }
    else { o.speed = +(g.speed * (0.95 + R() * 0.4)).toFixed(2); o.pause = +((g.pause ?? 1.4) * (0.6 + R() * 0.6)).toFixed(2); o.glance = pick([0, 3.6, 4.4, 5.2]); }
    o.range = +((g.range || 4.5) + R() * 1.8).toFixed(2);
    o.fov = Math.round((g.fov || 70) + R() * 14);
    o.phase = +(R() * 6).toFixed(2);
    return o;
  });
  const L = { ...base, guards };
  if (!solve(L).ok) continue;
  if (!solve(L, 0.45, lo).ok) continue;
  if (solve(L, 0.45, hi).ok) continue;
  found = { guards, time: solve(L).time };
}
if (!found) { console.log('rien trouvé'); process.exit(1); }
console.log('temps prudent', found.time.toFixed(1), 's');
console.log(JSON.stringify(found.guards));
