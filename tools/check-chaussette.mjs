// Prouve que chaque niveau d'Opération chaussette peut être fini sans jamais être vue.
import { solve } from '../src/games/chaussette/solver.js';
import { LEVELS, levelFor } from '../src/games/chaussette/levels.js';

let all = true;
LEVELS.forEach((L, n) => {
  const r = solve(L);
  if (!r.ok) all = false;
  console.log(`${n + 1}. ${L.name.padEnd(22)} ${r.ok ? `OK  meilleur temps prudent ${r.time.toFixed(1)} s, ${r.socks} objet(s), ${r.guards} garde(s)` : 'ÉCHEC : ' + r.why}`);
  // mode difficile : vision agrandie (×1,15) et Arnaud en renfort
  const hard = solve(levelFor(L, 'difficile'), 0.45, 1.15);
  if (!hard.ok) all = false;
  console.log(`   difficile${L.hard ? ' + Arnaud' : ''} : ${hard.ok ? `OK  ${hard.time.toFixed(1)} s` : 'ÉCHEC : ' + hard.why}`);
});
process.exit(all ? 0 : 1);
