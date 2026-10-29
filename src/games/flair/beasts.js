// Les bêtes de la forêt et les bonus de Flair. Positions tirées de la graine de l'affaire :
// la même affaire a toujours les mêmes dangers au même endroit.
import { rng, lineOfSight, moveCircle } from '../../core/topdown.js';

// Contenu de chaque affaire (même ordre que CASES)
export const THREATS = [
  { hedgehog: 1, fox: 0, wasps: 0, skunk: 0, boar: 0, treats: 2, bones: 2, nose: 0 },
  { hedgehog: 2, fox: 1, wasps: 1, skunk: 0, boar: 0, treats: 3, bones: 3, nose: 1 },
  { hedgehog: 2, fox: 1, wasps: 2, skunk: 1, boar: 0, treats: 4, bones: 3, nose: 1 },
  { hedgehog: 2, fox: 2, wasps: 2, skunk: 1, boar: 1, treats: 4, bones: 3, nose: 1 },
  { hedgehog: 3, fox: 2, wasps: 3, skunk: 1, boar: 2, treats: 4, bones: 3, nose: 1 },
];

export const NAMES = { hedgehog: 'un hérisson', fox: 'le renard', wasps: 'les guêpes', boar: 'le sanglier' };

export function spawn(world, caseIndex, seed) {
  const R = rng(seed * 31 + 7);
  const cfg = THREATS[caseIndex];
  const main = world.trails[0].pts;
  const [sx, sy] = world.start;
  const taken = [];
  const free = (x, y) => !world.solid(x, y) && world.at(x, y) !== '~';
  const distTrail = (x, y) => { let d = 1e9; for (let i = 0; i < main.length; i += 2) d = Math.min(d, Math.hypot(main[i][0] - x, main[i][1] - y)); return d; };
  const objs = world.objects.map(o => [o.at[0] + 0.5, o.at[1] + 0.5]);
  // trouve une case libre qui respecte des distances à la piste, au départ, aux objets et aux autres éléments
  function place({ near = [0, 99], fromStart = 6, gap = 2.5 } = {}) {
    for (let k = 0; k < 600; k++) {
      const x = 1 + Math.floor(R() * (world.w - 2)), y = 1 + Math.floor(R() * (world.h - 2));
      if (!free(x, y)) continue;
      const cx = x + 0.5, cy = y + 0.5;
      if (Math.hypot(cx - sx - 0.5, cy - sy - 0.5) < fromStart) continue;
      const dt = distTrail(cx, cy);
      if (dt < near[0] || dt > near[1]) continue;
      if (objs.some(([ox, oy]) => Math.hypot(ox - cx, oy - cy) < 2.5)) continue;
      if (taken.some(([tx, ty]) => Math.hypot(tx - cx, ty - cy) < gap)) continue;
      taken.push([cx, cy]);
      return [cx, cy];
    }
    return null;
  }
  const beasts = [], zones = [], items = [];
  for (let k = 0; k < cfg.hedgehog; k++) { const p = place({ near: [0, 3] }); if (p) beasts.push({ kind: 'hedgehog', x: p[0], y: p[1], hx: p[0], hy: p[1], a: R() * 6.28, t: R() * 3, r: 0.4 }); }
  for (let k = 0; k < cfg.fox; k++) { const p = place({ near: [1.5, 4], fromStart: 8 }); if (p) beasts.push({ kind: 'fox', x: p[0], y: p[1], hx: p[0], hy: p[1], a: R() * 6.28, t: 0, state: 'idle', cool: 0, r: 0.4 }); }
  for (let k = 0; k < cfg.boar; k++) { const p = place({ near: [3, 6], fromStart: 9, gap: 4 }); if (p) beasts.push({ kind: 'boar', x: p[0], y: p[1], hx: p[0], hy: p[1], a: R() * 6.28, t: 0, state: 'idle', r: 0.55 }); }
  for (let k = 0; k < cfg.wasps; k++) { const p = place({ near: [1.8, 3.2], fromStart: 6 }); if (p) zones.push({ kind: 'wasps', x: p[0], y: p[1], r: 1.25, ph: R() * 6 }); }
  for (let k = 0; k < cfg.skunk; k++) { const p = place({ near: [0, 1.5], fromStart: 7, gap: 4 }); if (p) zones.push({ kind: 'skunk', x: p[0], y: p[1], r: 2.1, ph: R() * 6 }); }
  for (let k = 0; k < cfg.treats; k++) { const p = place({ near: [0.5, 5], fromStart: 3, gap: 2 }); if (p) items.push({ kind: 'treat', x: p[0], y: p[1] }); }
  for (let k = 0; k < cfg.bones; k++) { const p = place({ near: [2.5, 9], fromStart: 4, gap: 4 }); if (p) items.push({ kind: 'bone', x: p[0], y: p[1] }); }
  for (let k = 0; k < cfg.nose; k++) { const p = place({ near: [1, 5], fromStart: 5, gap: 3 }); if (p) items.push({ kind: 'nose', x: p[0], y: p[1] }); }
  return { beasts, zones, items };
}

// Fait vivre les bêtes. Renvoie la bête qui touche Talya ce tour-ci (ou null).
export function updateBeasts(world, beasts, talya, dt, events, mod = { beast: 1, sight: 1 }) {
  const sp = mod.beast, sr = mod.sight;
  let hit = null;
  const solid = world.solid;
  const seeT = (b, range) => {
    const d = Math.hypot(talya.x - b.x, talya.y - b.y);
    return d < range && lineOfSight(solid, b.x, b.y, talya.x, talya.y) && !world.slow(Math.floor(talya.x), Math.floor(talya.y));
  };
  for (const b of beasts) {
    b.t += dt;
    const dT = Math.hypot(talya.x - b.x, talya.y - b.y);
    if (b.kind === 'hedgehog') {
      // promenade lente autour de son coin de forêt
      if (b.t > 2.4) { b.t = 0; const back = Math.hypot(b.hx - b.x, b.hy - b.y) > 2.5; b.a = back ? Math.atan2(b.hy - b.y, b.hx - b.x) : b.a + (Math.random() - 0.5) * 2.4; }
      [b.x, b.y] = moveCircle(solid, b.x, b.y, b.r, Math.cos(b.a) * 0.6 * sp * dt, Math.sin(b.a) * 0.6 * sp * dt);
    } else if (b.kind === 'fox') {
      b.cool = Math.max(0, b.cool - dt);
      if (b.state === 'idle') {
        if (b.t > 2) { b.t = 0; b.a = Math.atan2(b.hy - b.y, b.hx - b.x) + (Math.random() - 0.5) * 2.5; }
        [b.x, b.y] = moveCircle(solid, b.x, b.y, b.r, Math.cos(b.a) * 0.9 * sp * dt, Math.sin(b.a) * 0.9 * sp * dt);
        if (!b.cool && seeT(b, 4.2 * sr)) { b.state = 'chase'; b.t = 0; events.push(['fox', b]); }
      } else if (b.state === 'chase') {
        b.a = Math.atan2(talya.y - b.y, talya.x - b.x);
        [b.x, b.y] = moveCircle(solid, b.x, b.y, b.r, Math.cos(b.a) * 2.15 * sp * dt, Math.sin(b.a) * 2.15 * sp * dt);
        if (b.t > 3.6 || dT > 7) { b.state = 'idle'; b.t = 0; b.cool = 3; }
      }
    } else if (b.kind === 'boar') {
      if (b.state === 'idle') {
        if (b.t > 3) { b.t = 0; b.a = Math.atan2(b.hy - b.y, b.hx - b.x) + (Math.random() - 0.5) * 2; }
        [b.x, b.y] = moveCircle(solid, b.x, b.y, b.r, Math.cos(b.a) * 0.4 * dt, Math.sin(b.a) * 0.4 * dt);
        if (b.t > 0.5 && seeT(b, 5.5 * sr)) { b.state = 'paw'; b.t = 0; b.a = Math.atan2(talya.y - b.y, talya.x - b.x); events.push(['boar', b]); }
      } else if (b.state === 'paw') {
        // il gratte le sol avant de charger : c'est le moment d'esquiver
        if (b.t > 0.9) { b.state = 'charge'; b.t = 0; }
      } else if (b.state === 'charge') {
        const vx = Math.cos(b.a) * 6.5 * sp * dt, vy = Math.sin(b.a) * 6.5 * sp * dt;
        const [nx, ny] = moveCircle(solid, b.x, b.y, b.r, vx, vy);
        const blocked = Math.hypot(nx - b.x, ny - b.y) < Math.hypot(vx, vy) * 0.5;
        b.x = nx; b.y = ny;
        if (blocked || b.t > 2.2) { b.state = 'stun'; b.t = 0; if (blocked) events.push(['thud', b]); }
      } else if (b.state === 'stun' && b.t > 1.6) { b.state = 'idle'; b.t = 0; }
    }
    const reach = b.r + 0.32;
    if (dT < reach && !hit) {
      if (b.kind === 'boar' && b.state !== 'charge') continue;
      hit = b;
    }
  }
  return hit;
}

// --- dessins (coordonnées écran, s = taille d'une case) ---
export function drawBeast(g, b, x, y, s, now) {
  const k = s / 34;
  g.save();
  g.translate(x, y);
  g.rotate(b.a);
  g.scale(k, k);
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(1, 2, b.kind === 'boar' ? 17 : 11, b.kind === 'boar' ? 11 : 7, 0, 0, Math.PI * 2); g.fill();
  if (b.kind === 'hedgehog') {
    g.strokeStyle = '#5a4630'; g.lineWidth = 1.6;
    for (let i = 0; i < 16; i++) { const a = Math.PI * 0.55 + (i / 15) * Math.PI * 0.9; g.beginPath(); g.moveTo(Math.cos(a) * 5, Math.sin(a) * 4); g.lineTo(Math.cos(a) * 11, Math.sin(a) * 8); g.stroke(); }
    g.fillStyle = '#7a6044'; g.beginPath(); g.ellipse(-1, 0, 9, 6.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c9b18c'; g.beginPath(); g.ellipse(8, 0, 4, 3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a120c'; g.beginPath(); g.arc(11.5, 0, 1.4, 0, Math.PI * 2); g.fill();
  } else if (b.kind === 'fox') {
    g.fillStyle = '#d2692a';
    g.beginPath(); g.ellipse(-15, Math.sin(now / 200) * 2, 8, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f3efe6'; g.beginPath(); g.ellipse(-21, Math.sin(now / 200) * 2, 3, 2.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d2692a';
    g.beginPath(); g.ellipse(-2, 0, 11, 6, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(6, -5); g.lineTo(18, 0); g.lineTo(6, 5); g.closePath(); g.fill();
    g.fillStyle = '#2a1a10';
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(7, sd * 2); g.lineTo(9, sd * 8); g.lineTo(11, sd * 2.5); g.fill(); }
    g.beginPath(); g.arc(18, 0, 1.5, 0, Math.PI * 2); g.fill();
  } else if (b.kind === 'boar') {
    const shake = b.state === 'paw' ? Math.sin(now / 25) * 1.5 : 0;
    g.translate(shake, 0);
    g.fillStyle = '#3b2c22'; g.beginPath(); g.ellipse(-2, 0, 16, 10, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4a382b'; g.beginPath(); g.ellipse(13, 0, 7, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8dcc4';
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(17, sd * 3); g.lineTo(23, sd * 6); g.lineTo(18, sd * 1); g.fill(); }
    g.fillStyle = '#2a1e16'; g.beginPath(); g.ellipse(-4, 0, 12, 2, 0, 0, Math.PI * 2); g.fill();
    if (b.state === 'stun') { g.fillStyle = '#ffe08a'; for (let i = 0; i < 3; i++) { const a = now / 200 + i * 2.1; g.beginPath(); g.arc(13 + Math.cos(a) * 9, Math.sin(a) * 9, 1.8, 0, Math.PI * 2); g.fill(); } }
  }
  g.restore();
}

// Les yeux des bêtes brillent dans le noir, bien au-delà de la zone éclairée.
export function drawEyes(g, b, x, y, s, now, dist) {
  if (dist > 10) return;
  const col = b.kind === 'boar' ? '255,80,60' : b.kind === 'fox' ? '255,190,80' : '220,230,180';
  const blink = Math.sin(now / 900 + b.hx * 3) > 0.96 ? 0.1 : 1;
  const alpha = Math.min(1, (10 - dist) / 5) * blink * (b.kind === 'hedgehog' ? 0.45 : 0.9);
  const ex = Math.cos(b.a), ey = Math.sin(b.a), px = -ey, py = ex;
  const off = s * (b.kind === 'boar' ? 0.42 : 0.3);
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const sd of [-1, 1]) {
    const cx = x + ex * off + px * sd * s * 0.09, cy = y + ey * off + py * sd * s * 0.09;
    g.fillStyle = `rgba(${col},${alpha})`;
    g.beginPath(); g.arc(cx, cy, s * 0.045, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(${col},${alpha * 0.25})`;
    g.beginPath(); g.arc(cx, cy, s * 0.14, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

export function drawZone(g, z, x, y, s, now) {
  if (z.kind === 'wasps') {
    g.save();
    g.fillStyle = 'rgba(255,200,60,.06)'; g.beginPath(); g.arc(x, y, z.r * s, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c9b27a'; g.beginPath(); g.ellipse(x, y, s * 0.2, s * 0.26, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(90,70,40,.6)'; g.lineWidth = 1;
    for (let k = -1; k <= 1; k++) { g.beginPath(); g.ellipse(x, y + k * s * 0.08, s * 0.19, s * 0.03, 0, 0, Math.PI * 2); g.stroke(); }
    for (let k = 0; k < 6; k++) {
      const a = now / (260 + k * 30) + k + z.ph, r = s * (0.45 + 0.4 * Math.sin(now / 500 + k));
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a * 1.3) * r, s * 0.045, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  } else if (z.kind === 'skunk') {
    g.save();
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + z.ph + now / 4000, r = z.r * s * (0.35 + (k % 3) * 0.22);
      const gx = x + Math.cos(a) * r * 0.6, gy = y + Math.sin(a) * r * 0.6;
      const grd = g.createRadialGradient(gx, gy, 0, gx, gy, r);
      grd.addColorStop(0, 'rgba(150,200,80,.16)'); grd.addColorStop(1, 'rgba(150,200,80,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(gx, gy, r, 0, Math.PI * 2); g.fill();
    }
    // la moufette au centre
    g.translate(x, y); g.rotate(Math.sin(now / 1500 + z.ph) * 0.6);
    const k = s / 34;
    g.scale(k, k);
    g.fillStyle = '#1b1b1d'; g.beginPath(); g.ellipse(0, 0, 9, 5.5, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(-10, 0, 6, 5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f2f2ee'; g.fillRect(-14, -1.2, 22, 2.4);
    g.fillStyle = '#1b1b1d'; g.beginPath(); g.arc(9, 0, 3.6, 0, Math.PI * 2); g.fill();
    g.restore();
  }
}

export function drawItem(g, it, x, y, s, now) {
  const k = s / 34;
  g.save();
  g.translate(x, y + Math.sin(now / 400 + x) * s * 0.03);
  g.scale(k, k);
  if (it.kind === 'treat') {
    g.fillStyle = '#c48a4a';
    g.beginPath(); g.roundRect(-6, -2.5, 12, 5, 2.5); g.fill();
    for (const sx of [-6, 6]) for (const sy of [-2.5, 2.5]) { g.beginPath(); g.arc(sx, sy, 2.6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-4, -1.6, 7, 1.2);
  } else if (it.kind === 'bone') {
    const glow = g.createRadialGradient(0, 0, 0, 0, 0, 16);
    glow.addColorStop(0, 'rgba(255,215,110,.35)'); glow.addColorStop(1, 'rgba(255,215,110,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(0, 0, 16, 0, Math.PI * 2); g.fill();
    g.rotate(0.5);
    g.fillStyle = '#f2c14e';
    g.fillRect(-7, -2, 14, 4);
    for (const sx of [-7, 7]) for (const sy of [-2.4, 2.4]) { g.beginPath(); g.arc(sx, sy, 3, 0, Math.PI * 2); g.fill(); }
  } else if (it.kind === 'nose') {
    const p = 1 + Math.sin(now / 200) * 0.08;
    g.scale(p, p);
    const glow = g.createRadialGradient(0, 0, 0, 0, 0, 18);
    glow.addColorStop(0, 'rgba(255,140,200,.45)'); glow.addColorStop(1, 'rgba(255,140,200,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a1414'; g.beginPath(); g.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff8cc8';
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 3, 1, 1.8, 2.4, 0, 0, Math.PI * 2); g.fill(); }
  }
  g.restore();
}
