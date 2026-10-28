// Vérifie que chaque niveau de Réacteur est faisable et que son par est exact.
import { parse, trace, solve } from '../src/games/reacteur/engine.js';
import { LEVELS } from '../src/games/reacteur/levels.js';
let ok = true;
LEVELS.forEach((L, n) => {
  const g = parse(L.rows);
  const start = trace(g);
  const r = solve(g, 1e9);
  const good = r.sols >= 1 && r.par === L.par && !start.solved;
  if (!good) ok = false;
  console.log(`${String(n + 1).padStart(2)} ${L.name.padEnd(18)} ${g.w}x${g.h} pièces ${g.mut.length} cœurs ${g.targets.length} alarmes ${g.alarms.length} par ${L.par} solutions ${r.sols} ${good ? 'OK' : 'ÉCHEC'}`);
});
process.exit(ok ? 0 : 1);
