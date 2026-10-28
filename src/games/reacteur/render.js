// Dessin du plateau de Réacteur sur un canvas 2D.
import { mirrorKind } from './engine.js';

const C = {
  board: '#0a1a1d',
  edge: 'rgba(125,235,255,.14)',
  grid: 'rgba(125,235,255,.06)',
  wall: '#13282c',
  wallLine: 'rgba(125,235,255,.10)',
  beam: '125,235,255',
  core: '#7debff',
  coreDim: '#244449',
  metal: '#dfe9ea',
  metalDark: '#7e9497',
  ball: '#d4e157',
  alarm: '#ff5a4e',
};

export function targetAngle(cell) {
  const k = mirrorKind(cell);
  return k === 0 ? -45 : 45;
}

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

export function drawBoard(ctx, g, tr, v) {
  const { cs, ox, oy, t = 0 } = v;
  const reach = v.reach == null ? Infinity : v.reach;
  const reached = (map, i) => !map || !map.has(i) || map.get(i) <= reach + 0.01;
  const W = g.w * cs, H = g.h * cs;
  const cx = i => ox + ((i % g.w) + 0.5) * cs;
  const cy = i => oy + (Math.floor(i / g.w) + 0.5) * cs;

  // plateau
  ctx.save();
  rr(ctx, ox - 6, oy - 6, W + 12, H + 12, 18);
  ctx.fillStyle = C.board; ctx.fill();
  ctx.strokeStyle = C.edge; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();

  // repères de grille (petites croix aux intersections)
  ctx.save();
  ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
  for (let y = 1; y < g.h; y++) for (let x = 1; x < g.w; x++) {
    const px = ox + x * cs, py = oy + y * cs, a = cs * 0.08;
    ctx.beginPath(); ctx.moveTo(px - a, py); ctx.lineTo(px + a, py); ctx.moveTo(px, py - a); ctx.lineTo(px, py + a); ctx.stroke();
  }
  ctx.restore();

  for (let i = 0; i < g.cells.length; i++) {
    const c = g.cells[i], x = cx(i), y = cy(i);
    if (c.t === 'wall') drawWall(ctx, x, y, cs);
    else if (c.t === 'emitter') drawEmitter(ctx, x, y, cs, c, t);
    else if (c.t === 'socket') drawSocket(ctx, x, y, cs, c.s === 0);
    else if (c.t === 'target') drawCoreBase(ctx, x, y, cs);
    else if (c.t === 'ball') drawBall(ctx, x, y, cs);
    else if (c.t === 'alarm') drawAlarm(ctx, x, y, cs, tr.alarmHit.has(i) && reached(tr.alarmDist, i), t);
  }

  // ancien trajet qui s'efface, puis nouveau faisceau qui se propage depuis l'émetteur
  if (v.ghost && v.ghost.alpha > 0.01) drawBeam(ctx, v.ghost.paths, null, Infinity, cs, ox, oy, t, 0, v.ghost.alpha * 0.55);
  drawBeam(ctx, tr.paths, tr.offsets, reach, cs, ox, oy, t, v.boost || 0, 1);

  // pièces au-dessus du faisceau
  for (let i = 0; i < g.cells.length; i++) {
    const c = g.cells[i];
    const k = mirrorKind(c);
    if (k === null) continue;
    const ang = v.angles && v.angles.has(i) ? v.angles.get(i) : targetAngle(c);
    const sc = v.scales && v.scales.has(i) ? v.scales.get(i) : 1;
    drawMirror(ctx, cx(i), cy(i), cs, ang, c.t === 'fixed', sc, v.pressed === i);
  }
  for (const i of g.targets) drawCore(ctx, cx(i), cy(i), cs, tr.lit.has(i) && reached(tr.litDist, i), t, v.boost || 0);

  if (v.focus != null) {
    ctx.save();
    ctx.strokeStyle = 'rgba(241,243,238,.9)'; ctx.lineWidth = 2;
    rr(ctx, cx(v.focus) - cs / 2 + 3, cy(v.focus) - cs / 2 + 3, cs - 6, cs - 6, 10); ctx.stroke();
    ctx.restore();
  }
}

function drawWall(ctx, x, y, cs) {
  const s = cs * 0.86;
  ctx.save();
  rr(ctx, x - s / 2, y - s / 2, s, s, cs * 0.14);
  ctx.fillStyle = C.wall; ctx.fill();
  ctx.clip();
  ctx.strokeStyle = C.wallLine; ctx.lineWidth = 1.5;
  for (let k = -s; k < s; k += cs * 0.16) { ctx.beginPath(); ctx.moveTo(x - s / 2 + k, y + s / 2); ctx.lineTo(x - s / 2 + k + s, y - s / 2); ctx.stroke(); }
  ctx.restore();
}

function drawEmitter(ctx, x, y, cs, c, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(c.dy, c.dx));
  const s = cs * 0.8;
  rr(ctx, -s / 2, -s * 0.34, s * 0.82, s * 0.68, s * 0.2);
  ctx.fillStyle = '#16343a'; ctx.fill();
  ctx.strokeStyle = 'rgba(125,235,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  const pulse = 0.75 + Math.sin(t / 300) * 0.25;
  const grd = ctx.createRadialGradient(s * 0.3, 0, 0, s * 0.3, 0, s * 0.45);
  grd.addColorStop(0, `rgba(230,253,255,${pulse})`);
  grd.addColorStop(0.4, `rgba(${C.beam},${0.6 * pulse})`);
  grd.addColorStop(1, `rgba(${C.beam},0)`);
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(s * 0.3, 0, s * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e6fdff';
  ctx.beginPath(); ctx.arc(s * 0.3, 0, s * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSocket(ctx, x, y, cs, empty) {
  ctx.save();
  ctx.strokeStyle = empty ? 'rgba(125,235,255,.38)' : 'rgba(125,235,255,.18)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([cs * 0.07, cs * 0.07]);
  ctx.beginPath(); ctx.arc(x, y, cs * 0.36, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  if (empty) { ctx.fillStyle = 'rgba(125,235,255,.4)'; ctx.beginPath(); ctx.arc(x, y, cs * 0.05, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function drawCoreBase(ctx, x, y, cs) {
  ctx.save();
  ctx.fillStyle = '#0d2429';
  ctx.beginPath(); ctx.arc(x, y, cs * 0.34, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawCore(ctx, x, y, cs, lit, t, boost) {
  const r = cs * 0.3;
  ctx.save();
  ctx.translate(x, y);
  if (lit) {
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, cs * (0.7 + boost * 0.3));
    glow.addColorStop(0, 'rgba(200,250,255,.55)');
    glow.addColorStop(0.35, 'rgba(125,235,255,.25)');
    glow.addColorStop(1, 'rgba(125,235,255,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, cs * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  // anneau segmenté, qui tourne quand il est alimenté
  ctx.rotate(lit ? t / (700 - boost * 400) : 0);
  const segs = 10;
  ctx.lineWidth = cs * 0.075;
  ctx.lineCap = 'round';
  ctx.strokeStyle = lit ? C.core : C.coreDim;
  for (let k = 0; k < segs; k++) {
    const a0 = (k / segs) * Math.PI * 2 + 0.12, a1 = ((k + 1) / segs) * Math.PI * 2 - 0.12;
    ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); ctx.stroke();
  }
  ctx.rotate(lit ? -t / 350 : 0);
  ctx.fillStyle = lit ? '#eafcff' : '#1a3a40';
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawBall(ctx, x, y, cs) {
  const r = cs * 0.25;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(x + r * 0.15, y + r * 0.9, r * 0.9, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  const grd = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
  grd.addColorStop(0, '#eef59a'); grd.addColorStop(1, '#a9b83a');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(1.4, cs * 0.03);
  ctx.beginPath(); ctx.arc(x - r * 1.05, y, r * 0.75, -0.9, 0.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + r * 1.05, y, r * 0.75, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  ctx.restore();
}

function drawAlarm(ctx, x, y, cs, hit, t) {
  const r = cs * 0.24;
  ctx.save();
  ctx.translate(x, y);
  if (hit) {
    const p = 0.5 + Math.sin(t / 90) * 0.5;
    ctx.fillStyle = `rgba(255,90,78,${0.18 + p * 0.25})`;
    ctx.beginPath(); ctx.arc(0, 0, cs * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.rotate(Math.PI / 4);
  rr(ctx, -r, -r, r * 2, r * 2, r * 0.35);
  ctx.fillStyle = '#2a1413'; ctx.fill();
  ctx.strokeStyle = C.alarm; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = hit ? '#ffd0cb' : C.alarm;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawMirror(ctx, x, y, cs, angDeg, fixed, scale, pressed) {
  const L = cs * 0.78 * scale;
  ctx.save();
  ctx.translate(x, y);
  if (!fixed) {
    ctx.strokeStyle = pressed ? 'rgba(241,243,238,.55)' : 'rgba(241,243,238,.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, cs * 0.4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.rotate((angDeg * Math.PI) / 180);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = cs * 0.16;
  ctx.beginPath(); ctx.moveTo(-L / 2 + 1, 2); ctx.lineTo(L / 2 + 1, 2); ctx.stroke();
  const grd = ctx.createLinearGradient(-L / 2, 0, L / 2, 0);
  if (fixed) { grd.addColorStop(0, '#5d6f72'); grd.addColorStop(0.5, '#a9babc'); grd.addColorStop(1, '#5d6f72'); }
  else { grd.addColorStop(0, '#9fb2b5'); grd.addColorStop(0.5, '#ffffff'); grd.addColorStop(1, '#9fb2b5'); }
  ctx.strokeStyle = grd; ctx.lineWidth = cs * 0.11;
  ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.lineTo(L / 2, 0); ctx.stroke();
  if (fixed) {
    ctx.fillStyle = '#2b3b3e';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * L * 0.34, 0, cs * 0.035, 0, Math.PI * 2); ctx.fill(); }
  } else {
    ctx.fillStyle = '#0a1a1d';
    ctx.beginPath(); ctx.arc(0, 0, cs * 0.05, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Tronque un tracé à la distance `reach` (en cases) depuis l'émetteur.
function clip(path, d0, reach) {
  if (reach === Infinity) return path;
  let left = reach - d0;
  if (left <= 0) return null;
  const out = [path[0]];
  for (let k = 1; k < path.length; k++) {
    const [ax, ay] = path[k - 1], [bx, by] = path[k];
    const len = Math.abs(bx - ax) + Math.abs(by - ay);
    if (len <= left) { out.push(path[k]); left -= len; continue; }
    const f = left / len;
    out.push([ax + (bx - ax) * f, ay + (by - ay) * f, true]);
    return out;
  }
  return out;
}

function drawBeam(ctx, paths, offsets, reach, cs, ox, oy, t, boost, alpha) {
  const P = p => [ox + (p[0] + 0.5) * cs, oy + (p[1] + 0.5) * cs];
  const shown = [];
  paths.forEach((p, k) => { const c = clip(p, offsets ? offsets[k] : 0, reach); if (c && c.length >= 2) shown.push(c); });
  if (!shown.length) return;
  const stroke = () => {
    for (const path of shown) {
      ctx.beginPath();
      path.forEach((p, k) => { const [x, y] = P(p); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
    }
  };
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const layers = [
    [cs * (0.42 + boost * 0.2), 0.07 + boost * 0.05],
    [cs * 0.2, 0.16 + boost * 0.1],
    [cs * 0.08, 0.55],
  ];
  for (const [lw, a] of layers) { ctx.strokeStyle = `rgba(${C.beam},${a * alpha})`; ctx.lineWidth = lw; stroke(); }
  ctx.strokeStyle = `rgba(240,254,255,${0.95 * alpha})`; ctx.lineWidth = Math.max(1.2, cs * 0.028);
  stroke();
  if (alpha >= 1) {
    // particules qui filent dans le sens du faisceau
    ctx.setLineDash([cs * 0.05, cs * 0.5]);
    ctx.lineDashOffset = -t * cs * 0.004;
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = cs * 0.06;
    stroke();
    ctx.setLineDash([]);
    // tête du faisceau pendant la propagation
    for (const path of shown) {
      const last = path[path.length - 1];
      if (!last[2]) continue;
      const [x, y] = P(last);
      const g = ctx.createRadialGradient(x, y, 0, x, y, cs * 0.5);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.3, `rgba(${C.beam},.5)`); g.addColorStop(1, `rgba(${C.beam},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, cs * 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}
