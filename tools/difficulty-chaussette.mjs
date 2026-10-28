// Mesure jusqu'à quel point on peut agrandir les champs de vision avant que le niveau devienne impossible.
// ≈ 1,0 : très serré ; 1,3 : technique ; au-delà de 2 : facile.
import { solve } from '../src/games/chaussette/solver.js';
import { LEVELS } from '../src/games/chaussette/levels.js';
const only = process.argv[2] ? process.argv[2].split(',').map(n => Number(n) - 1) : LEVELS.map((_, i) => i);
for (const n of only) {
  const L = LEVELS[n];
  const base = solve(L);
  if (!base.ok) { console.log(`${n + 1}. ${L.name.padEnd(22)} IMPOSSIBLE : ${base.why}`); continue; }
  let lo = 1, hi = 3;
  for (let k = 0; k < 7; k++) { const m = (lo + hi) / 2; if (solve(L, 0.45, m).ok) lo = m; else hi = m; }
  console.log(`${n + 1}. ${L.name.padEnd(22)} vision ×${lo.toFixed(2)} encore faisable  temps prudent ${base.time.toFixed(1)} s`);
}
