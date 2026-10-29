// Opération Osmose : Talya vole les CD de Seta, les magazines et les stickers Osmose sans se faire voir,
// puis rentre au panier. Plus elle avance doucement, plus elle est discrète.
import { h, backButton, soundButton, sheet, ICONS, buzz, reducedMotion } from '../../core/ui.js';
import { get, set } from '../../core/store.js';
import { sfx } from '../../core/sound.js';
import { moveCircle, createStick, fitCanvas, drawTalyaTop, lerpAngle } from '../../core/topdown.js';
import { parseLevel, guardPose, sees, visionPolygon, TALYA_SPEED, TALYA_R } from './world.js';
import { LEVELS, LOOT, lootKind, levelFor } from './levels.js';
import { getMode, setMode, modeSwitch } from '../../core/modes.js';
import { gameBar, nextMissionButton } from '../../core/nav.js';

// Réglages des modes : portée et angle de vision, vitesse de repérage
const MODE = {
  facile: { range: 0.75, fov: 0.85, sus: 0.6 },
  normal: { range: 1, fov: 1, sus: 1 },
  difficile: { range: 1.15, fov: 1.08, sus: 1.35 },
};

export const SAVE_KEY = 'chaussette';
export const COUNT = LEVELS.length;
// temps de référence (environ 1,5 fois le meilleur temps prudent trouvé par le solveur)
const TARGET = [26, 32, 44, 33, 46];

const PAL = {
  floorA: '#2b2521', floorB: '#2f2823', seam: 'rgba(0,0,0,.22)',
  rug: '#25403f', rugEdge: '#2f5150',
  wall: '#121416', wallEdge: 'rgba(255,236,210,.12)',
  table: '#7a5536', tableTop: '#8c6340',
  bed: '#3c4a63', pillow: '#d9d4c7',
  sofa: '#5b3a46', sofaCushion: '#6d4854',
  counter: '#5d6266', counterTop: '#767c80',
  wardrobe: '#3b2a20', plant: '#355c3b', pot: '#8a5a3a',
  cone: '255,214,150', alert: '255,90,78',
};

export function mount(root) {
  root.classList.add('g-screen', 'chaussette');
  const save = get(SAVE_KEY, { best: {}, last: 0 });
  save.best = save.best || {};
  const isOpen = n => n === 0 || save.best[n - 1] != null || save.best[n] != null;

  const levelEl = h('div', { class: 'cs-level' });
  const socksEl = h('div', { class: 'cs-socks', 'aria-label': 'Butin' });
  const timeEl = h('div', { class: 'cs-time' }, '0,0');
  const eyeEl = h('div', { class: 'cs-eye', title: 'Repérage' }, h('span', { class: 'cs-eye-ico', html: EYE_SVG }), h('div', { class: 'cs-eye-bar' }, h('i')));
  const hintEl = h('p', { class: 'cs-tip', 'aria-live': 'polite' });
  const canvas = h('canvas', { 'aria-label': 'Appartement vu de dessus. Déplace Talya avec le doigt ou les flèches.' });
  const stage = h('div', { class: 'td-stage' }, canvas);
  const levelsBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Choisir un niveau', html: ICONS.grid, onclick: openLevels });
  const modeEl = modeSwitch('chaussette', () => onModeChange());

  root.append(
    gameBar('chaussette', 'Opération Osmose', levelsBtn),
    h('div', { class: 'cs-hud' }, levelEl, h('div', { class: 'cs-right' }, socksEl, eyeEl, timeEl)),
    stage,
    h('div', { class: 'cs-tools' }, hintEl, soundButton()),
    h('div', { class: 'cs-mode' }, modeEl),
  );

  const ctx = canvas.getContext('2d');
  const stick = createStick(stage);
  let li = isOpen(save.last || 0) ? save.last || 0 : 0;
  let world, L, talya, guards, socks, time, state, spotted, maxSus, ts, ox, oy, W, H, bg;
  let checkpoint = null, grace = 0, withHard = false;
  const GRACE = 2.5;
  const deaths = {};
  // les gardes « vus par le jeu » : portée et angle ajustés selon le mode choisi
  function applyMode() {
    const m = MODE[getMode('chaussette')];
    if (guards) for (const gd of guards) gd.v = { ...gd.g, range: gd.g.range * m.range, fov: gd.g.fov * m.fov };
  }
  // Arnaud n'arrive qu'en difficile : si l'équipe de garde change, on relance le niveau.
  function onModeChange() {
    const hard = !!L.hard && getMode('chaussette') === 'difficile';
    if (hard !== withHard) load(li); else applyMode();
  }
  let particles = [];

  function load(n) {
    li = n; save.last = n; set(SAVE_KEY, save);
    L = LEVELS[n];
    withHard = !!L.hard && getMode('chaussette') === 'difficile';
    world = parseLevel(levelFor(L, getMode('chaussette')));
    const [sx, sy] = world.start;
    talya = { x: sx + 0.5, y: sy + 0.5, a: -Math.PI / 2, moving: false, speed: 0, ears: 1 };
    guards = world.guards.map(g => ({ g, tau: 0, sus: 0, look: null, pose: guardPose(g, 0) }));
    applyMode();
    checkpoint = null; grace = 0;
    socks = world.socks.map(([x, y], k) => ({ x: x + 0.5, y: y + 0.5, taken: false, ph: Math.random() * 6, kind: lootKind(n, k) }));
    time = 0; state = 'ready'; spotted = 0; maxSus = 0; particles = [];
    levelEl.innerHTML = '';
    levelEl.append(h('small', {}, `Niveau ${n + 1} sur ${COUNT}`), L.name);
    hintEl.textContent = L.hint;
    stick.reset();
    bg = null;
    paintHud();
  }

  function paintHud() {
    socksEl.innerHTML = '';
    socks.forEach(s => socksEl.append(h('span', { class: 'sock' + (s.taken ? ' on' : ''), title: LOOT[s.kind].name, html: LOOT_SVG[s.kind] })));
    timeEl.textContent = time.toFixed(1).replace('.', ',');
  }

  // --- rendu du décor (une seule fois par niveau et par taille) ---
  function layout() {
    ({ W, H } = fitCanvas(canvas, ctx));
    ts = Math.floor(Math.min((W - 8) / world.w, (H - 8) / world.h));
    ox = Math.round((W - ts * world.w) / 2);
    oy = Math.round((H - ts * world.h) / 2);
  }

  function groups(ch) {
    const seen = new Set(), out = [];
    for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
      if (world.at(x, y) !== ch || seen.has(y * world.w + x)) continue;
      let x1 = x; while (world.at(x1 + 1, y) === ch) x1++;
      let y1 = y; while ([...Array(x1 - x + 1)].every((_, k) => world.at(x + k, y1 + 1) === ch)) y1++;
      for (let yy = y; yy <= y1; yy++) for (let xx = x; xx <= x1; xx++) seen.add(yy * world.w + xx);
      out.push({ x, y, w: x1 - x + 1, h: y1 - y + 1 });
    }
    return out;
  }

  function buildBackground() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = document.createElement('canvas');
    c.width = ts * world.w * dpr; c.height = ts * world.h * dpr;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
      const ch = world.at(x, y), px = x * ts, py = y * ts;
      if (ch === '#') continue;
      g.fillStyle = (y % 2) ? PAL.floorA : PAL.floorB;
      g.fillRect(px, py, ts, ts);
      g.fillStyle = PAL.seam;
      g.fillRect(px, py + ts - 1, ts, 1);
      if ((x + y * 3) % 4 === 0) g.fillRect(px, py, 1, ts);
    }
    for (const r of groups(',')) {
      g.fillStyle = PAL.rug; roundRect(g, r.x * ts + 2, r.y * ts + 2, r.w * ts - 4, r.h * ts - 4, ts * 0.2); g.fill();
      g.strokeStyle = PAL.rugEdge; g.lineWidth = 2; roundRect(g, r.x * ts + 6, r.y * ts + 6, r.w * ts - 12, r.h * ts - 12, ts * 0.14); g.stroke();
    }
    // murs, avec un liseré clair côté pièce
    for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
      if (world.at(x, y) !== '#') continue;
      g.fillStyle = PAL.wall; g.fillRect(x * ts, y * ts, ts, ts);
      g.fillStyle = PAL.wallEdge;
      if (world.at(x, y + 1) !== '#' && y + 1 < world.h) g.fillRect(x * ts, (y + 1) * ts - 2, ts, 2);
      if (world.at(x, y - 1) !== '#' && y > 0) g.fillRect(x * ts, y * ts, ts, 1.5);
      if (world.at(x + 1, y) !== '#' && x + 1 < world.w) g.fillRect((x + 1) * ts - 1.5, y * ts, 1.5, ts);
      if (world.at(x - 1, y) !== '#' && x > 0) g.fillRect(x * ts, y * ts, 1.5, ts);
    }
    // panier
    const [bx, by] = world.start;
    const cx = (bx + 0.5) * ts, cy = (by + 0.5) * ts;
    g.fillStyle = '#6b4a35'; g.beginPath(); g.ellipse(cx, cy, ts * 0.47, ts * 0.42, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#b9a58c'; g.beginPath(); g.ellipse(cx, cy, ts * 0.33, ts * 0.29, 0, 0, Math.PI * 2); g.fill();
    // meubles bas (au sol) : canapés, plans de travail, armoires, plantes
    for (const r of groups('s')) {
      const X = r.x * ts + 2, Y = r.y * ts + 2, Wd = r.w * ts - 4, Ht = r.h * ts - 4;
      shadow(g, X, Y, Wd, Ht);
      g.fillStyle = PAL.sofa; roundRect(g, X, Y, Wd, Ht, ts * 0.25); g.fill();
      g.fillStyle = PAL.sofaCushion;
      const vertical = r.h > r.w;
      const n = Math.max(r.w, r.h);
      for (let k = 0; k < n; k++) {
        if (vertical) { roundRect(g, X + Wd * 0.28, Y + k * ts + 4, Wd * 0.64, ts - 8, ts * 0.15); }
        else { roundRect(g, X + k * ts + 4, Y + Ht * 0.28, ts - 8, Ht * 0.64, ts * 0.15); }
        g.fill();
      }
    }
    for (const r of groups('k')) {
      const X = r.x * ts + 1, Y = r.y * ts + 1, Wd = r.w * ts - 2, Ht = r.h * ts - 2;
      shadow(g, X, Y, Wd, Ht);
      g.fillStyle = PAL.counter; roundRect(g, X, Y, Wd, Ht, 3); g.fill();
      g.fillStyle = PAL.counterTop; roundRect(g, X + 3, Y + 3, Wd - 6, Ht - 6, 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1;
      for (let k = 1; k < r.w; k++) { g.beginPath(); g.moveTo(X + k * ts, Y + 3); g.lineTo(X + k * ts, Y + Ht - 3); g.stroke(); }
    }
    for (const r of groups('w')) {
      const X = r.x * ts + 1, Y = r.y * ts + 1, Wd = r.w * ts - 2, Ht = r.h * ts - 2;
      shadow(g, X, Y, Wd, Ht);
      g.fillStyle = PAL.wardrobe; roundRect(g, X, Y, Wd, Ht, 3); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(X + Wd / 2, Y + 3); g.lineTo(X + Wd / 2, Y + Ht - 3); g.stroke();
    }
    for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
      if (world.at(x, y) !== 'p') continue;
      const px = (x + 0.5) * ts, py = (y + 0.5) * ts;
      g.fillStyle = PAL.pot; g.beginPath(); g.arc(px, py, ts * 0.28, 0, Math.PI * 2); g.fill();
      g.fillStyle = PAL.plant;
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        g.beginPath(); g.ellipse(px + Math.cos(a) * ts * 0.2, py + Math.sin(a) * ts * 0.2, ts * 0.2, ts * 0.11, a, 0, Math.PI * 2); g.fill();
      }
    }
    bg = c;
  }

  // meubles sous lesquels on se cache : dessinés au-dessus de Talya
  function drawCovers(g, under) {
    for (const r of groups('t')) {
      const X = ox + r.x * ts + 3, Y = oy + r.y * ts + 3, Wd = r.w * ts - 6, Ht = r.h * ts - 6;
      const inside = under && talya.x > r.x && talya.x < r.x + r.w && talya.y > r.y && talya.y < r.y + r.h;
      g.globalAlpha = inside ? 0.45 : 1;
      shadow(g, X, Y, Wd, Ht);
      g.fillStyle = PAL.table; roundRect(g, X, Y, Wd, Ht, ts * 0.12); g.fill();
      g.fillStyle = PAL.tableTop; roundRect(g, X + 3, Y + 3, Wd - 6, Ht - 6, ts * 0.1); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1;
      for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(X + 5, Y + (Ht * k) / 4); g.lineTo(X + Wd - 5, Y + (Ht * k) / 4); g.stroke(); }
      g.globalAlpha = 1;
    }
    for (const r of groups('b')) {
      const X = ox + r.x * ts + 2, Y = oy + r.y * ts + 2, Wd = r.w * ts - 4, Ht = r.h * ts - 4;
      const inside = under && talya.x > r.x && talya.x < r.x + r.w && talya.y > r.y && talya.y < r.y + r.h;
      g.globalAlpha = inside ? 0.45 : 1;
      shadow(g, X, Y, Wd, Ht);
      g.fillStyle = PAL.bed; roundRect(g, X, Y, Wd, Ht, ts * 0.15); g.fill();
      g.fillStyle = PAL.pillow;
      const vertical = Ht >= Wd;
      if (vertical) roundRect(g, X + 4, Y + 4, Wd - 8, ts * 0.45, 5); else roundRect(g, X + 4, Y + 4, ts * 0.45, Ht - 8, 5);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.06)';
      if (vertical) roundRect(g, X + 3, Y + ts * 0.65, Wd - 6, Ht - ts * 0.7, 4); else roundRect(g, X + ts * 0.65, Y + 3, Wd - ts * 0.7, Ht - 6, 4);
      g.fill();
      g.globalAlpha = 1;
    }
  }

  function drawGuard(gd) {
    const p = gd.pose, x = ox + p.x * ts, y = oy + p.y * ts;
    const a = gd.look != null ? gd.look : p.a;
    ctx.save();
    ctx.translate(x, y);
    if (gd.g.kind === 'dog') {
      drawLab(ctx, a, ts, p.moving);
    } else if (gd.g.kind === 'cat') {
      ctx.rotate(a);
      const s = ts / 34;
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(1, 2, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c9823f';
      ctx.beginPath(); ctx.ellipse(-2, 0, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(8, 0, 5, 0, Math.PI * 2); ctx.fill();
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(7, sd * 2); ctx.lineTo(10, sd * 7); ctx.lineTo(12, sd * 2); ctx.fill(); }
      ctx.strokeStyle = '#c9823f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.quadraticCurveTo(-18, 6 * Math.sin(performance.now() / 400), -20, 0); ctx.stroke();
      ctx.fillStyle = 'rgba(90,50,20,.55)';
      for (const k of [-6, -2, 2]) { ctx.fillRect(k, -5, 1.6, 10); }
      ctx.fillStyle = '#2a1a0a';
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(10.5, sd * 1.8, 1, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.rotate(a);
      const s = ts / 34;
      ctx.scale(s, s);
      const swing = p.moving && gd.look == null ? Math.sin(performance.now() / 160) * 4 : 0;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(2, 2, 11, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = gd.g.shirt;
      ctx.beginPath(); ctx.ellipse(-2 + swing, -12, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-2 - swing, 12, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 13, 0, 0, Math.PI * 2); ctx.fill();
      // mains et visage (couleur de peau propre à chacun), cheveux vus du dessus
      ctx.fillStyle = gd.g.skin;
      ctx.beginPath(); ctx.arc(1 + swing, -14.5, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(1 - swing, 14.5, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(2.5, 0, 6.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = gd.g.hair; ctx.beginPath(); ctx.ellipse(0.5, 0, 6, 6.2, 0, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0.5, 0, 3.4, 6.2, 0, -Math.PI * 0.5, Math.PI * 0.5); ctx.fill();
    }
    ctx.restore();
    // bulle d'alerte
    if (gd.sus > 0.2) {
      const caught = gd.sus >= 1;
      ctx.save();
      ctx.font = `800 ${Math.round(ts * 0.62)}px "Big Shoulders Display", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = caught ? `rgb(${PAL.alert})` : '#ffd38a';
      ctx.fillText(caught ? '!' : '?', x, y - ts * 0.85);
      ctx.restore();
    }
  }

  function drawCone(gd) {
    const poly = visionPolygon(world, gd.v, { ...gd.pose, a: gd.look != null ? gd.look : gd.pose.a });
    const x0 = ox + gd.pose.x * ts, y0 = oy + gd.pose.y * ts;
    const k = Math.min(1, gd.sus);
    const col = k > 0.05 ? mix(PAL.cone, PAL.alert, k) : PAL.cone;
    const grd = ctx.createRadialGradient(x0, y0, ts * 0.3, x0, y0, gd.v.range * ts);
    grd.addColorStop(0, `rgba(${col},${0.3 + k * 0.2})`);
    grd.addColorStop(1, `rgba(${col},0.03)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    poly.forEach(([px, py], i) => { const X = ox + px * ts, Y = oy + py * ts; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.closePath();
    ctx.fill();
  }

  // --- logique ---
  let raf = 0, last = performance.now(), alive = true;
  function step(dt, now) {
    if (state !== 'play' && state !== 'ready') return;
    if (bot && state === 'ready' && bot.path) state = 'play';
    const v = bot && bot.path ? botInput() : stick.get();
    const mag = Math.min(1, Math.hypot(v.x, v.y));
    if (state === 'ready' && mag > 0.05) state = 'play';
    if (state !== 'play') return;
    time += dt;
    if (mag > 0.05) {
      const sp = TALYA_SPEED * (0.35 + 0.65 * mag);
      const [nx, ny] = moveCircle(world.solid, talya.x, talya.y, TALYA_R, v.x * sp * dt, v.y * sp * dt);
      talya.speed = Math.hypot(nx - talya.x, ny - talya.y) / dt / TALYA_SPEED;
      talya.x = nx; talya.y = ny;
      talya.a = lerpAngle(talya.a, Math.atan2(v.y, v.x), Math.min(1, dt * 14));
      talya.moving = true;
    } else { talya.moving = false; talya.speed = 0; }

    // butin
    socks.forEach(s => {
      if (s.taken || Math.hypot(s.x - talya.x, s.y - talya.y) > 0.55) return;
      s.taken = true;
      // point de reprise : on repartira d'ici avec le butin déjà volé
      checkpoint = { x: s.x, y: s.y, a: talya.a, taken: socks.map(q => q.taken), taus: guards.map(g => g.tau), time, spotted };
      sfx.place(); sfx.lit(socks.filter(q => q.taken).length);
      buzz(15);
      for (let k = 0; k < 14; k++) particles.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 0.7 });
      paintHud();
    });
    const allTaken = socks.every(s => s.taken);
    const [bx, by] = world.start;
    if (allTaken && Math.hypot(bx + 0.5 - talya.x, by + 0.5 - talya.y) < 0.45) return win();

    // gardes
    grace = Math.max(0, grace - dt);
    const hidden = grace > 0 || world.hide(Math.floor(talya.x), Math.floor(talya.y));
    const susRate = MODE[getMode('chaussette')].sus;
    for (const gd of guards) {
      const attentive = gd.sus > 0.25;
      if (!attentive) gd.tau += dt;
      gd.pose = guardPose(gd.g, gd.tau);
      const look = { ...gd.pose, a: gd.look != null ? gd.look : gd.pose.a };
      const visible = !hidden && sees(world, gd.v, look, talya.x, talya.y);
      if (visible) {
        const d = Math.hypot(talya.x - gd.pose.x, talya.y - gd.pose.y);
        const near = Math.max(0, 1 - d / gd.v.range);
        const stealth = 0.55 + 0.45 * Math.min(1, talya.speed);
        const before = gd.sus;
        gd.sus += dt * (0.8 + 2.2 * near) * stealth * susRate;
        if (before <= 0.2 && gd.sus > 0.2) { spotted++; sfx.tick(); }
        const want = Math.atan2(talya.y - gd.pose.y, talya.x - gd.pose.x);
        gd.look = lerpAngle(gd.look != null ? gd.look : gd.pose.a, want, Math.min(1, dt * (gd.sus > 0.25 ? 6 : 0)));
        if (gd.sus <= 0.25) gd.look = null;
      } else {
        gd.sus = Math.max(0, gd.sus - dt * 0.45);
        if (gd.look != null) {
          gd.look = lerpAngle(gd.look, gd.pose.a, Math.min(1, dt * 2.5));
          if (gd.sus < 0.12) gd.look = null;
        }
      }
      maxSus = Math.max(maxSus, gd.sus);
      if (gd.sus >= 1) return caught(gd);
    }
    talya.ears += ((Math.max(...guards.map(g => g.sus), 0) > 0.25 ? 0.3 : 1) - talya.ears) * Math.min(1, dt * 6);
    const top = Math.max(0, ...guards.map(g => g.sus));
    eyeEl.querySelector('i').style.width = Math.min(100, top * 100) + '%';
    eyeEl.classList.toggle('hot', top > 0.25);
    if (Math.floor(time * 10) !== Math.floor((time - dt) * 10)) timeEl.textContent = time.toFixed(1).replace('.', ',');
  }

  function caught(gd) {
    state = 'caught';
    deaths[li] = (deaths[li] || 0) + 1;
    sfx.alarm(); buzz(80);
    setTimeout(() => {
      let close;
      const offerEasy = deaths[li] >= 6 && getMode('chaussette') !== 'facile';
      const got = checkpoint ? checkpoint.taken.filter(Boolean).length : 0;
      close = sheet([
        h('h2', {}, 'Repérée.'),
        h('p', {}, gd.g.kind === 'dog' ? 'Kahina a tout vu. Elle a aboyé une fois, puis elle a remué la queue. Trop tard, la maison est réveillée.' : `${gd.g.name} a vu une queue blanche dépasser. Talya fait semblant de dormir.`),
        offerEasy ? h('div', { class: 'easy-offer' },
          h('b', {}, 'Passer en mode facile ?'),
          h('span', {}, 'Pas de jugement. Les cônes sont plus courts et on te repère moins vite. Tu peux revenir au mode normal à tout moment.'),
          h('button', { class: 'btn', type: 'button', onclick: () => { setMode('chaussette', 'facile'); modeEl.refresh(); close(); checkpoint ? resume() : load(li); } }, 'Oui, mode facile')) : null,
        h('div', { class: 'actions' },
          checkpoint ? h('button', { class: 'btn', type: 'button', onclick: () => { close(); resume(); } }, `Reprendre au dernier objet volé (${got} sur ${socks.length})`) : null,
          h('button', { class: 'btn' + (checkpoint ? ' ghost' : ''), type: 'button', onclick: () => { close(); load(li); } }, 'Recommencer le niveau'),
          h('a', { class: 'btn ghost', href: '#/missions' }, 'Retour aux missions')),
      ], 'cs-sheet');
    }, reducedMotion() ? 100 : 700);
  }

  // Cherche un moment de la ronde où personne ne regarde le point de reprise pendant quelques secondes,
  // pour ne pas réapparaître sous le nez d'un garde.
  function safeShift(cp) {
    for (let d = 0; d < 60; d += 0.2) {
      let ok = true;
      for (let t = 0; t <= GRACE + 1.5 && ok; t += 0.1) {
        for (let k = 0; k < guards.length && ok; k++) {
          const gd = guards[k], pose = guardPose(gd.g, cp.taus[k] + d + t);
          if (Math.hypot(pose.x - cp.x, pose.y - cp.y) < 1.8 || sees(world, gd.v, pose, cp.x, cp.y, 0.8)) ok = false;
        }
      }
      if (ok) return d;
    }
    return 0;
  }

  // Reprend au dernier point de sauvegarde : même butin volé, gardes décalés vers un moment calme.
  function resume() {
    const cp = checkpoint;
    talya.x = cp.x; talya.y = cp.y; talya.a = cp.a; talya.moving = false; talya.ears = 1;
    socks.forEach((q, k) => { q.taken = cp.taken[k]; });
    const shift = safeShift(cp);
    guards.forEach((gd, k) => { gd.tau = cp.taus[k] + shift; gd.sus = 0; gd.look = null; gd.pose = guardPose(gd.g, gd.tau); });
    time = cp.time; spotted = cp.spotted;
    state = 'ready'; grace = GRACE;
    stick.reset();
    paintHud();
  }

  function win() {
    state = 'won';
    const prev = save.best[li];
    const record = prev == null || time < prev.time;
    if (record) save.best[li] = { time, ghost: spotted === 0 };
    else if (spotted === 0 && !prev.ghost) save.best[li].ghost = true;
    set(SAVE_KEY, save);
    sfx.win(); buzz(30);
    const last = li === COUNT - 1;
    const fast = time <= TARGET[li];
    const lines = [
      spotted === 0 ? 'Personne n’a rien vu. Du grand art.' : `Repérée ${spotted} fois, jamais prise.`,
      fast ? `Sous l’objectif de ${TARGET[li]} s.` : `Objectif : moins de ${TARGET[li]} s.`,
    ];
    setTimeout(() => {
      let close;
      const go = n => { close(); load(n); };
      close = sheet([
        h('h2', {}, last ? 'Tout le butin.' : spotted === 0 && fast ? 'Fantôme.' : 'Larcin réussi.'),
        h('p', {}, last ? 'Le tout premier numéro d’Osmose dort désormais dans le panier. Florian ne le reverra jamais.' : lines[0]),
        h('div', { class: 'stat-row' },
          h('div', { class: 'stat' }, h('b', {}, time.toFixed(1).replace('.', ',') + ' s'), h('span', {}, fast ? 'objectif tenu' : 'objectif ' + TARGET[li] + ' s')),
          h('div', { class: 'stat' }, h('b', {}, spotted), h('span', {}, spotted === 1 ? 'alerte' : 'alertes')),
          prev ? h('div', { class: 'stat' }, h('b', {}, Math.min(prev.time, time).toFixed(1).replace('.', ',') + ' s'), h('span', {}, 'record')) : null),
        h('div', { class: 'actions' },
          last ? nextMissionButton('chaussette', true) : h('button', { class: 'btn', type: 'button', onclick: () => go(li + 1) }, 'Niveau suivant'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => go(li) }, 'Rejouer'),
          last ? h('a', { class: 'btn ghost', href: '#/missions' }, 'Retour aux missions') : null),
      ], 'cs-sheet');
    }, reducedMotion() ? 100 : 600);
  }

  function openLevels() {
    let close;
    close = sheet([
      h('h2', {}, 'Niveaux'),
      h('p', {}, 'Un point doré : niveau fini sans aucune alerte.'),
      h('div', { class: 'lv-grid' }, LEVELS.map((lv, n) => {
        const b = save.best[n];
        return h('button', {
          class: ['lv', 'cs-lv', b ? 'done' : '', b && b.ghost ? 'perfect' : '', n === li ? 'current' : ''].join(' '),
          type: 'button', disabled: !isOpen(n), 'aria-label': `Niveau ${n + 1}, ${lv.name}`, onclick: () => { close(); load(n); },
        }, n + 1);
      })),
      h('div', { class: 'actions' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => close() }, 'Fermer')),
    ], 'cs-sheet');
  }

  function frame(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const prevW = W, prevH = H;
    layout();
    if (!bg || W !== prevW || H !== prevH) buildBackground();
    step(dt, now);

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, ox, oy, ts * world.w, ts * world.h);
    for (const gd of guards) drawCone(gd);
    // butin
    for (const s of socks) {
      if (s.taken) continue;
      const bob = reducedMotion() ? 0 : Math.sin(now / 300 + s.ph) * 0.06;
      drawLoot(ctx, s.kind, ox + s.x * ts, oy + (s.y + bob) * ts, ts, s.ph, now);
    }
    // le panier brille quand tout est volé
    if (socks.every(s => s.taken)) {
      const [bx, by] = world.start;
      const pulse = 0.5 + Math.sin(now / 250) * 0.5;
      ctx.strokeStyle = `rgba(255,214,150,${0.35 + pulse * 0.45})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ox + (bx + 0.5) * ts, oy + (by + 0.5) * ts, ts * (0.55 + pulse * 0.12), 0, Math.PI * 2); ctx.stroke();
    }
    if (!(grace > 0 && Math.floor(now / 110) % 2)) drawTalyaTop(ctx, ox + talya.x * ts, oy + talya.y * ts, talya.a, ts, now, talya.moving, { ears: talya.ears });
    if (grace > 0) {
      // temps de discrétion restant après une reprise
      ctx.strokeStyle = 'rgba(255,214,150,.75)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ox + talya.x * ts, oy + talya.y * ts, ts * 0.62, -Math.PI / 2, -Math.PI / 2 + (grace / GRACE) * Math.PI * 2); ctx.stroke();
    }
    drawCovers(ctx, true);
    for (const gd of guards) drawGuard(gd);
    // particules
    particles = particles.filter(p => (p.life -= dt) > 0);
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.fillStyle = `rgba(255,214,150,${p.life / 0.7})`;
      ctx.beginPath(); ctx.arc(ox + p.x * ts, oy + p.y * ts, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    stick.draw(ctx);
    raf = requestAnimationFrame(frame);
  }

  // pilote automatique de test (?bot) : suit le parcours trouvé par le solveur, avec les vraies règles du jeu
  let bot = null;
  if (/[?&]bot\b/.test(location.search)) {
    bot = { path: null };
    import('./solver.js').then(m => { bot.DT = m.DT; bot.solve = lv => m.solve(levelFor(lv, getMode('chaussette')), m.MARGIN, getMode('chaussette') === 'difficile' ? 1.15 : 1); bot.path = bot.solve(L).path; });
  }
  function botInput() {
    // suit la position prévue par le solveur à l'instant présent (interpolée entre deux étapes)
    const f = (time + 0.05) / bot.DT, k = Math.min(bot.path.length - 1, Math.floor(f)), k2 = Math.min(bot.path.length - 1, k + 1), fr = f - Math.floor(f);
    const cx = bot.path[k][0] + (bot.path[k2][0] - bot.path[k][0]) * fr, cy = bot.path[k][1] + (bot.path[k2][1] - bot.path[k][1]) * fr;
    const dx = cx + 0.5 - talya.x, dy = cy + 0.5 - talya.y, d = Math.hypot(dx, dy);
    if (d < 0.03) return { x: 0, y: 0 };
    const m = Math.min(1, d * 6);
    return { x: (dx / d) * m, y: (dy / d) * m };
  }
  window.__cs = { get state() { return state; }, get time() { return time; }, get spotted() { return spotted; }, get taken() { return socks.filter(q => q.taken).length; }, get sus() { return Math.max(0, ...guards.map(g => g.sus)); }, get guards() { return guards.map(g => g.g.name); }, get grace() { return grace; }, catchNow: () => caught(guards[0]), stopBot: () => { if (bot) bot.path = null; }, load: n => { load(n); if (bot && bot.solve) bot.path = bot.solve(L).path; } };

  load(li);
  raf = requestAnimationFrame(frame);
  return {
    unmount() { alive = false; cancelAnimationFrame(raf); stick.destroy(); },
  };
}

const EYE_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/></svg>';
const LOOT_SVG = {
  cd: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="currentColor"/><circle cx="12" cy="12" r="3.6" fill="rgba(0,0,0,.45)"/><circle cx="12" cy="12" r="1.4" fill="#1b1816"/></svg>',
  mag: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="1.5" fill="currentColor"/><rect x="5" y="2.5" width="14" height="5" rx="1.5" fill="rgba(0,0,0,.4)"/><rect x="8" y="10" width="8" height="8" rx="1" fill="rgba(0,0,0,.25)"/></svg>',
  sticker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7l-6 6H7a3 3 0 0 1-3-3z" fill="currentColor"/><path d="M14 20v-4a2 2 0 0 1 2-2h4z" fill="rgba(0,0,0,.35)"/><circle cx="11" cy="11" r="3.4" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="2"/></svg>',
};

// Le butin vu de dessus : CD de la mixtape Seta, magazine Osmose, sticker Osmose.
function drawLoot(ctx, kind, x, y, ts, ph, now) {
  const s = ts / 30;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(255,214,150,.18)';
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
  if (kind === 'cd') {
    // disque argenté avec un reflet qui tourne, étiquette rouge Seta au centre
    ctx.rotate(now / 1400 + ph);
    ctx.fillStyle = '#c9ced3';
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(160,220,255,.55)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 10, -0.5, 0.25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,220,.45)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 10, 2.6, 3.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d23c2c';
    ctx.beginPath(); ctx.arc(0, 0, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1816';
    ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'mag') {
    // couverture d'Osmose : papier crème, bandeau du titre, photo au centre
    ctx.rotate(-0.25 + Math.sin(ph) * 0.2);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-6.5, -8, 14, 18);
    ctx.fillStyle = '#f1ebdf'; ctx.fillRect(-7.5, -9.5, 14, 18);
    ctx.fillStyle = '#1d1a16'; ctx.fillRect(-7.5, -9.5, 14, 4.2);
    ctx.fillStyle = '#f1ebdf'; for (let k = 0; k < 5; k++) ctx.fillRect(-6 + k * 2.4, -8.3, 1.4, 1.8);
    ctx.fillStyle = '#c8362b'; ctx.fillRect(-5.5, -3.5, 10, 9);
    ctx.fillStyle = '#f1ebdf'; ctx.beginPath(); ctx.arc(-0.5, 1, 2.6, 0, Math.PI * 2); ctx.fill();
  } else {
    // sticker jaune avec le « O » d'Osmose et un coin décollé
    ctx.rotate(0.3 + Math.sin(ph) * 0.25);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(-9, -9, 18, 18, 4); ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(7, -7); ctx.lineTo(7, 2); ctx.lineTo(2, 7); ctx.lineTo(-7, 7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1d1a16'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(-0.5, -0.5, 3.6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e3dccd';
    ctx.beginPath(); ctx.moveTo(7, 2); ctx.lineTo(2, 2); ctx.lineTo(2, 7); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// Kahina, labrador chocolat, vue de dessus (oreilles tombantes, grosse queue)
function drawLab(ctx, a, ts, moving) {
  const s = ts / 34, t = performance.now();
  ctx.rotate(a);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(1, 2, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
  const C = '#94603b', D = '#74492b';
  ctx.fillStyle = D;
  for (const [lx, ly] of [[8, -7], [8, 7], [-9, -7], [-9, 7]]) { ctx.beginPath(); ctx.ellipse(lx + (moving ? Math.sin(t / 80 + lx) * 2 : 0), ly, 3.6, 2.4, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = C; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-20, Math.sin(t / 150) * 6, -24, Math.sin(t / 150) * 3); ctx.stroke();
  ctx.fillStyle = C;
  ctx.beginPath(); ctx.ellipse(-1, 0, 15, 8.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(13, 0, 7, 6.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(19.5, 0, 4.4, 3.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = D;
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(11, sd * 6.2, 4.6, 2.4, sd * 0.35, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#1e120b'; ctx.beginPath(); ctx.arc(23.4, 0, 1.9, 0, Math.PI * 2); ctx.fill();
}

function roundRect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function shadow(g, x, y, w, h) { g.fillStyle = 'rgba(0,0,0,.28)'; roundRect(g, x + 2, y + 3, w, h, 6); g.fill(); }
function mix(a, b, k) {
  const A = a.split(',').map(Number), B = b.split(',').map(Number);
  return A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',');
}
