// Prouve que chaque niveau d'Opération chaussette peut être fini sans jamais être vue.
import { solve } from '../src/games/chaussette/solver.js';
import { LEVELS } from '../src/games/chaussette/levels.js';

let all = true;
LEVELS.forEach((L, n) => {
  const r = solve(L);
  if (!r.ok) all = false;
  console.log(`${n + 1}. ${L.name.padEnd(22)} ${r.ok ? `OK  meilleur temps prudent ${r.time.toFixed(1)} s, ${r.socks} chaussette(s), ${r.guards} garde(s)` : 'ÉCHEC : ' + r.why}`);
});
process.exit(all ? 0 : 1);
