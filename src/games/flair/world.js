// Monde de Flair : une forêt de nuit générée à partir d'une graine, une piste d'odeur qui mène
// à l'objet recherché, et des fausses pistes qui s'en détachent. Aucun accès au DOM.
import { rng, astar } from '../../core/topdown.js';

export const SCENTS = {
  dot: { label: 'rond' },
  diamond: { label: 'losange' },
  tri: { label: 'triangle' },
  square: { label: 'carré' },
  star: { label: 'étoile' },
};

export const OBJECTS = {
  ball: { name: 'la balle', color: '#d4e157' },
  keys: { name: 'les clés de Florian', color: '#e3b04b' },
  sandwich: { name: 'le goûter', color: '#e8c27a' },
  sock: { name: 'la chaussette', color: '#e9e4da' },
  gift: { name: 'le cadeau', color: '#b8202f' },
  sausage: { name: 'une saucisse', color: '#c46a4a' },
  cone: { name: 'une pomme de pin', color: '#7a5a3a' },
  glove: { name: 'un gant', color: '#5b6fa3' },
  bone: { name: 'un os', color: '#e6dfcf' },
};

// Affaires : la cible, son odeur, les fausses pistes et la difficulté.
export const CASES = [
  { name: 'La balle', seed: 11, w: 18, h: 28, target: 'ball', scent: ['dot', '#ffc94d'], decoys: [], gaps: 0,
    intro: 'Talya a perdu sa balle. Elle sait exactement où elle est. Enfin, son nez le sait.',
    hint: 'Maintiens Flairer pour voir les odeurs et suis les ronds dorés. Les hérissons piquent : contourne-les.' },
  { name: 'Les clés', seed: 23, w: 20, h: 30, target: 'keys', scent: ['diamond', '#6fe3ff'], decoys: [['sausage', 'tri', '#ff7aa8']], gaps: 0,
    intro: 'Florian cherche ses clés depuis vingt minutes. Talya, elle, a déjà une idée.',
    hint: 'Suis les losanges bleus. Le renard court moins vite que toi, sauf quand tu flaires. Les buissons te cachent.' },
  { name: 'Le goûter', seed: 37, w: 20, h: 32, target: 'sandwich', scent: ['square', '#b6f25a'], decoys: [['cone', 'dot', '#ffc94d'], ['glove', 'star', '#c69bff']], gaps: 0,
    intro: 'Quelqu’un a caché un goûter dans la forêt. Talya considère que c’est un cadeau.',
    hint: 'Flaire par petites bouffées, évite les guêpes, et ne flaire surtout pas dans le nuage de la moufette.' },
  { name: 'La chaussette', seed: 41, w: 22, h: 34, target: 'sock', scent: ['star', '#c69bff'], decoys: [['bone', 'square', '#b6f25a'], ['sausage', 'tri', '#ff7aa8'], ['glove', 'diamond', '#6fe3ff']], gaps: 1,
    intro: 'Une chaussette a disparu. Talya a un alibi, mais elle veut quand même la retrouver.',
    hint: 'La piste s’efface au ruisseau, elle reprend plus loin. Un sanglier gratte le sol avant de charger : écarte-toi.' },
  { name: 'Le cadeau', seed: 58, w: 22, h: 36, target: 'gift', scent: ['dot', '#ff6b5e'], decoys: [['bone', 'square', '#b6f25a'], ['cone', 'star', '#c69bff'], ['sausage', 'diamond', '#6fe3ff']], gaps: 2,
    intro: 'Quelqu’un a caché un cadeau pour les 30 ans de Florian. Talya va le trouver avant lui.',
    hint: 'Ronds rouges. Toute la forêt est réveillée. Au flair, les os dorés scintillent.' },
];

function valueNoise(R, w, h, cell) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
  const grid = Array.from({ length: gw * gh }, () => R());
  return (x, y) => {
    const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const g = (a, b) => grid[(b % gh) * gw + (a % gw)];
    const a = g(ix, iy) * (1 - sx) + g(ix + 1, iy) * sx;
    const b = g(ix, iy + 1) * (1 - sx) + g(ix + 1, iy + 1) * sx;
    return a * (1 - sy) + b * sy;
  };
}

// '.' herbe, ',' clairière, 'T' arbre, 'R' rocher, 'b' buisson (ralentit), '~' ruisseau (efface les odeurs)
// La génération peut échouer pour une graine donnée : on essaie les suivantes (toujours le même résultat).
export function buildCase(c) {
  for (let k = 0; k < 60; k++) { const W = tryBuild(c, c.seed + k * 101); if (W) return W; }
  return null;
}

function tryBuild(c, seed) {
  const R = rng(seed * 7919 + 1);
  const { w, h } = c;
  const n1 = valueNoise(R, w, h, 4), n2 = valueNoise(R, w, h, 2.2);
  const tiles = new Array(w * h).fill('.');
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 'T' : tiles[y * w + x]);
  const put = (x, y, v) => { if (x >= 0 && y >= 0 && x < w && y < h) tiles[y * w + x] = v; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = n1(x, y) * 0.7 + n2(x, y) * 0.3 + (R() - 0.5) * 0.18;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) put(x, y, 'T');
    else if (v > 0.62) put(x, y, 'T');
    else if (v > 0.57) put(x, y, R() < 0.25 ? 'R' : 'b');
    else if (v < 0.2) put(x, y, ',');
  }
  // un ruisseau qui traverse la forêt pour les affaires avec des trous dans la piste
  const streams = [];
  for (let k = 0; k < c.gaps; k++) {
    const sy = Math.floor(h * (0.62 - k * 0.3));
    let y = sy;
    for (let x = 1; x < w - 1; x++) {
      put(x, y, '~');
      streams.push([x, y]);
      if (R() < 0.3) { y += R() < 0.5 ? -1 : 1; put(x, y, '~'); streams.push([x, y]); }
    }
  }
  // clairière de départ
  const start = [Math.floor(w / 2), h - 3];
  for (let y = start[1] - 1; y <= start[1] + 1; y++) for (let x = start[0] - 2; x <= start[0] + 2; x++) if (at(x, y) !== '~') put(x, y, ',');

  const passable = (x, y) => { const t = at(x, y); return t !== 'T' && t !== 'R'; };
  const baseCost = (x, y) => { const t = at(x, y); return t === 'T' || t === 'R' ? Infinity : t === 'b' ? 3 : t === '~' ? 1.5 : 1; };

  // cible : loin du départ, dans la moitié haute
  const pickSpot = (minY, maxY, avoid, minDist) => {
    for (let k = 0; k < 400; k++) {
      const x = 2 + Math.floor(R() * (w - 4)), y = minY + Math.floor(R() * (maxY - minY));
      if (!passable(x, y) || at(x, y) === '~') continue;
      if (avoid.some(([ax, ay]) => Math.hypot(ax - x, ay - y) < minDist)) continue;
      return [x, y];
    }
    return null;
  };
  const target = pickSpot(2, Math.floor(h * 0.25), [start], 10);
  if (!target) return null;
  // clairière autour de l'objet
  for (let y = target[1] - 1; y <= target[1] + 1; y++) for (let x = target[0] - 1; x <= target[0] + 1; x++) if (x > 0 && y > 0 && x < w - 1 && y < h - 1 && at(x, y) !== '~') put(x, y, ',');

  // piste principale : A* avec du bruit dans les coûts pour un tracé organique
  const wob = valueNoise(R, w, h, 3);
  const main = astar(w, h, (x, y) => baseCost(x, y) * (0.6 + wob(x, y) * 1.4), start[0], start[1], target[0], target[1]);
  if (!main) return null;
  const onMain = new Set(main.map(([x, y]) => y * w + x));
  // voisinage de la piste principale : les fausses pistes doivent vraiment s'en écarter
  const nearMain = new Set();
  for (const [x, y] of main) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) nearMain.add((y + dy) * w + x + dx);

  // fausses pistes : partent de la piste principale et s'en écartent
  const decoys = [];
  for (let k = 0; k < c.decoys.length; k++) {
    const [obj, shape, color] = c.decoys[k];
    const from = main[Math.floor(main.length * (0.18 + (k / Math.max(1, c.decoys.length)) * 0.55 + R() * 0.08))];
    let spot = null;
    for (let tries = 0; tries < 200 && !spot; tries++) {
      const s = pickSpot(3, h - 4, [start, target, ...decoys.map(d => d.at)], 7);
      if (s && Math.hypot(s[0] - from[0], s[1] - from[1]) > 7 && main.every(([mx, my]) => Math.hypot(mx - s[0], my - s[1]) >= 3.5)) spot = s;
    }
    if (!spot) return null;
    const path = astar(w, h, (x, y) => {
      const i = y * w + x;
      const near = Math.hypot(x - from[0], y - from[1]) < 2 ? 1 : onMain.has(i) ? 12 : nearMain.has(i) ? 5 : 1;
      return baseCost(x, y) * near * (0.7 + wob(y, x) * 1.2);
    }, from[0], from[1], spot[0], spot[1]);
    if (!path) return null;
    for (let y = spot[1] - 1; y <= spot[1] + 1; y++) for (let x = spot[0] - 1; x <= spot[0] + 1; x++) if (x > 0 && y > 0 && x < w - 1 && y < h - 1 && at(x, y) !== '~') put(x, y, ',');
    decoys.push({ obj, shape, color, at: spot, cells: path });
  }

  const trails = [
    { main: true, shape: c.scent[0], color: c.scent[1], pts: smooth(main, R) },
    ...decoys.map(d => ({ main: false, shape: d.shape, color: d.color, pts: smooth(d.cells, R) })),
  ];
  // l'eau efface l'odeur : on découpe les tracés là où ils traversent le ruisseau (± 1 case)
  const wet = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(Math.floor(x) + dx, Math.floor(y) + dy) === '~') return true; return false; };
  for (const t of trails) t.dry = t.pts.map(([x, y]) => !wet(x, y));

  const objects = [{ kind: c.target, at: target, real: true }, ...decoys.map(d => ({ kind: d.obj, at: d.at, real: false }))];
  const length = polyLength(trails[0].pts);
  return { w, h, tiles, at, start, target, trails, objects, length, solid: (x, y) => !passable(x, y), slow: (x, y) => at(x, y) === 'b' };
}

// Centres de cases → courbe adoucie (Chaikin), avec une légère ondulation.
function smooth(cells, R) {
  let pts = cells.map(([x, y]) => [x + 0.5, y + 0.5]);
  for (let it = 0; it < 3; it++) {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  // rééchantillonnage tous les 0,25 case
  const res = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const d = Math.hypot(bx - ax, by - ay);
    acc += d;
    while (acc >= 0.25) {
      acc -= 0.25;
      const f = 1 - acc / d;
      res.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
    }
  }
  const ph = R() * 10;
  return res.map(([x, y], i) => {
    const j = Math.max(1, Math.min(res.length - 2, i));
    const tx = res[j + 1][0] - res[j - 1][0], ty = res[j + 1][1] - res[j - 1][1], tl = Math.hypot(tx, ty) || 1;
    const o = Math.sin(i * 0.21 + ph) * 0.12;
    return [x - (ty / tl) * o, y + (tx / tl) * o];
  });
}

export function polyLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}
