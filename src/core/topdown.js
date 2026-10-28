// Socle commun aux jeux vus de dessus (Flair, Opération chaussette).
// Coordonnées en cases : la case (x, y) couvre [x, x+1[ × [y, y+1[.

export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Déplace un disque de rayon r en glissant le long des cases pleines.
export function moveCircle(solid, x, y, r, dx, dy) {
  const hit = (px, py) => {
    const x0 = Math.floor(px - r), x1 = Math.floor(px + r), y0 = Math.floor(py - r), y1 = Math.floor(py + r);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!solid(tx, ty)) continue;
      const cx = Math.max(tx, Math.min(px, tx + 1)), cy = Math.max(ty, Math.min(py, ty + 1));
      if ((px - cx) ** 2 + (py - cy) ** 2 < r * r) return true;
    }
    return false;
  };
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (r * 0.5)));
  const sx = dx / steps, sy = dy / steps;
  for (let k = 0; k < steps; k++) {
    if (!hit(x + sx, y)) x += sx;
    if (!hit(x, y + sy)) y += sy;
  }
  return [x, y];
}

// Ligne de vue entre deux points (en cases), bloquée par opaque(tx, ty).
export function lineOfSight(opaque, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const n = Math.ceil(dist * 4);
  for (let k = 1; k < n; k++) {
    const px = x0 + (dx * k) / n, py = y0 + (dy * k) / n;
    if (opaque(Math.floor(px), Math.floor(py))) return false;
  }
  return true;
}

// A* sur grille 4-connexe. cost(x, y) renvoie Infinity pour un mur.
export function astar(w, h, cost, sx, sy, gx, gy) {
  const N = w * h, open = [], g = new Float64Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const H = i => Math.abs((i % w) - gx) + Math.abs(Math.floor(i / w) - gy);
  const start = sy * w + sx, goal = gy * w + gx;
  g[start] = 0; open.push([H(start), start]);
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
    const [, cur] = open.splice(bi, 1)[0];
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % w, cy = Math.floor(cur / w);
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + ax, ny = cy + ay;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const c = cost(nx, ny);
      if (!isFinite(c)) continue;
      const ni = ny * w + nx, ng = g[cur] + c;
      if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; open.push([ng + H(ni), ni]); }
    }
  }
  if (!isFinite(g[goal])) return null;
  const path = [];
  for (let i = goal; i !== -1; i = from[i]) path.push([i % w, Math.floor(i / w)]);
  return path.reverse();
}

// Joystick tactile (le pouce se pose n'importe où sur la zone) + flèches / ZQSD / WASD.
export function createStick(zone) {
  const st = { x: 0, y: 0, active: false, ox: 0, oy: 0, px: 0, py: 0, id: null, keys: new Set() };
  const R = 46;
  const down = e => {
    if (st.id !== null || e.target.closest('button, a')) return;
    st.id = e.pointerId; st.active = true;
    const r = zone.getBoundingClientRect();
    st.ox = st.px = e.clientX - r.left; st.oy = st.py = e.clientY - r.top;
    zone.setPointerCapture && zone.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const move = e => {
    if (e.pointerId !== st.id) return;
    const r = zone.getBoundingClientRect();
    st.px = e.clientX - r.left; st.py = e.clientY - r.top;
    let dx = st.px - st.ox, dy = st.py - st.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) { st.ox += (dx / d) * (d - R); st.oy += (dy / d) * (d - R); dx = st.px - st.ox; dy = st.py - st.oy; }
    const m = Math.min(1, d / R);
    const a = Math.atan2(dy, dx);
    st.x = d > 6 ? Math.cos(a) * m : 0; st.y = d > 6 ? Math.sin(a) * m : 0;
  };
  const up = e => { if (e.pointerId !== st.id) return; st.id = null; st.active = false; st.x = st.y = 0; };
  const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], z: [0, -1], w: [0, -1], s: [0, 1], q: [-1, 0], a: [-1, 0], d: [1, 0] };
  const kd = e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (KEYS[k]) { st.keys.add(k); e.preventDefault(); } };
  const ku = e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; st.keys.delete(k); };
  zone.addEventListener('pointerdown', down);
  zone.addEventListener('pointermove', move);
  zone.addEventListener('pointerup', up);
  zone.addEventListener('pointercancel', up);
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);
  return {
    get() {
      if (st.keys.size) {
        let x = 0, y = 0;
        for (const k of st.keys) { x += KEYS[k][0]; y += KEYS[k][1]; }
        const d = Math.hypot(x, y) || 1;
        return { x: x / d, y: y / d };
      }
      return { x: st.x, y: st.y };
    },
    draw(ctx) {
      if (!st.active) return;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(st.ox, st.oy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.arc(st.ox + st.x * R, st.oy + st.y * R, 20, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },
    reset() { st.id = null; st.active = false; st.x = st.y = 0; st.keys.clear(); },
    destroy() {
      zone.removeEventListener('pointerdown', down); zone.removeEventListener('pointermove', move);
      zone.removeEventListener('pointerup', up); zone.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
    },
  };
}

// Ajuste un canvas à la taille CSS de son conteneur (pixels nets sur écran Retina).
export function fitCanvas(canvas, ctx) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { W, H, dpr };
}

// Talya vue de dessus. (x, y) en pixels, ang = direction du regard, s = taille d'une case en pixels.
export function drawTalyaTop(ctx, x, y, ang, s, t, moving, opts = {}) {
  const sc = s / 34;
  ctx.save();
  ctx.translate(x, y);
  // ombre
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath(); ctx.ellipse(1.5 * sc, 2.5 * sc, 15 * sc, 9 * sc, ang, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(ang);
  ctx.scale(sc, sc);
  const W = opts.color || '#f3f5f2', SH = '#d3dbd6';
  const step = moving ? Math.sin(t / 70) : 0;
  // pattes
  ctx.fillStyle = SH;
  for (const [lx, ly, ph] of [[7, -6, 0], [7, 6, Math.PI], [-8, -6, Math.PI], [-8, 6, 0]]) {
    const o = moving ? Math.sin(t / 70 + ph) * 3 : 0;
    ctx.beginPath(); ctx.ellipse(lx + o, ly, 3.4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  }
  // queue
  ctx.save();
  ctx.translate(-13, 0);
  ctx.rotate(Math.PI + Math.sin(t / (moving ? 90 : 260)) * 0.5);
  ctx.fillStyle = W;
  ctx.beginPath(); ctx.ellipse(6, 0, 7, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // corps
  ctx.fillStyle = W;
  ctx.beginPath(); ctx.ellipse(-1, 0, 14, 8 + step * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  // tête
  ctx.beginPath(); ctx.ellipse(12, 0, 6.8, 6.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(18.5, 0, 4.2, 3, 0, 0, Math.PI * 2); ctx.fill();
  // oreilles : deux triangles qui pointent vers l'avant et l'extérieur
  const earUp = opts.ears == null ? 1 : opts.ears;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(10, side * 4.5);
    ctx.rotate(side * (0.55 + (1 - earUp) * 0.6));
    ctx.fillStyle = W;
    ctx.beginPath(); ctx.moveTo(-3, -2.5 * side); ctx.lineTo(6.5, 0); ctx.lineTo(-3, 2.5 * side); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e3c9c3';
    ctx.beginPath(); ctx.moveTo(-1.5, -1.2 * side); ctx.lineTo(4, 0); ctx.lineTo(-1.5, 1.2 * side); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // truffe
  ctx.fillStyle = '#15100e';
  ctx.beginPath(); ctx.arc(22.3, 0, 1.9, 0, Math.PI * 2); ctx.fill();
  if (opts.sniff) {
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2;
    const k = (t / 140) % 1;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(25, side * 2, 2 + k * 5, -0.8, 0.8); ctx.stroke(); }
  }
  ctx.restore();
}

export function lerpAngle(a, b, f) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * f;
}
