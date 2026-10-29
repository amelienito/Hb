// Flair : une enquête au nez dans la forêt de nuit. En maintenant « Flairer », Talya voit les odeurs.
// Il faut suivre la bonne (forme et couleur indiquées en haut) sans se laisser distraire.
import { h, backButton, soundButton, sheet, ICONS, buzz, reducedMotion } from '../../core/ui.js';
import { get, set } from '../../core/store.js';
import { sfx } from '../../core/sound.js';
import { moveCircle, createStick, fitCanvas, drawTalyaTop, lerpAngle, rng } from '../../core/topdown.js';
import { CASES, OBJECTS, buildCase } from './world.js';
import { THREATS, NAMES, spawn, updateBeasts, drawBeast, drawEyes, drawZone, drawItem } from './beasts.js';
import { getMode, setMode, modeSwitch } from '../../core/modes.js';
import { nextMissionButton } from '../../core/nav.js';

// Modes : nombre de cœurs, vitesse et vigilance des bêtes, durée du souffle
const MODE = {
  facile: { hearts: 5, beast: 0.8, sight: 0.8, breath: 6.5 },
  normal: { hearts: 3, beast: 1, sight: 1, breath: 4.5 },
  difficile: { hearts: 2, beast: 1.15, sight: 1.2, breath: 3.6 },
};
const mode = () => MODE[getMode('flair')];

export const SAVE_KEY = 'flair';
export const COUNT = CASES.length;
const SPEED = 2.6;
const PENALTY = 8;
const SPACING = 0.6;     // écart entre deux traces d'odeur, en cases
const SCENT_R = 6.5;     // portée du flair, en cases

export function mount(root) {
  root.classList.add('g-screen', 'flair');
  const save = get(SAVE_KEY, { best: {}, last: 0 });
  save.best = save.best || {};
  const isOpen = n => n === 0 || save.best[n - 1] != null || save.best[n] != null;

  const levelEl = h('div', { class: 'fl-level' });
  const chipEl = h('div', { class: 'fl-chip', title: 'Odeur à suivre' });
  const breathEl = h('div', { class: 'fl-breath', title: 'Flair restant', role: 'meter', 'aria-label': 'Flair restant' }, h('i'));
  const timeEl = h('b', {}, '0,0');
  const penEl = h('span', { class: 'fl-pen', 'aria-hidden': 'true' });
  const clockEl = h('div', { class: 'fl-time' }, h('small', {}, 'ton temps'), timeEl, penEl);
  const modeEl = modeSwitch('flair', () => changeMode());
  const heartsEl = h('div', { class: 'fl-hearts', 'aria-label': 'Vies' });
  const bonesEl = h('div', { class: 'fl-bones', 'aria-label': 'Os dorés' });
  const powerEl = h('div', { class: 'fl-power' });
  const hintEl = h('p', { class: 'fl-tip', 'aria-live': 'polite' });
  const toastEl = h('div', { class: 'fl-toast', 'aria-live': 'polite' });
  const canvas = h('canvas', { 'aria-label': 'Forêt de nuit vue de dessus. Déplace Talya avec le doigt ou les flèches, maintiens Flairer.' });
  const sniffBtn = h('button', { class: 'fl-sniff', type: 'button', 'aria-label': 'Flairer (maintenir)', html: ICONS.nose + '<span>Flairer</span>' });
  const stage = h('div', { class: 'td-stage' }, canvas, sniffBtn, toastEl);
  const levelsBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Choisir une affaire', html: ICONS.grid, onclick: openLevels });

  root.append(
    h('header', { class: 'g-bar' }, backButton(), h('div', { class: 'g-title' }, 'Flair'), levelsBtn),
    h('div', { class: 'fl-hud' }, levelEl, h('div', { class: 'fl-right' }, chipEl, clockEl)),
    h('div', { class: 'fl-status' }, heartsEl, bonesEl, powerEl, h('div', { class: 'fl-breath-wrap' }, h('span', {}, 'Flair restant'), breathEl)),
    stage,
    h('div', { class: 'fl-tools' }, hintEl, soundButton()),
    h('div', { class: 'fl-mode' }, modeEl),
  );

  const ctx = canvas.getContext('2d');
  const stick = createStick(stage);
  let li = isOpen(save.last || 0) ? save.last || 0 : 0;
  let C, world, talya, objects, trails, time, penalty, wrong, state, breath, lock, sniffing, flair, sinceSniff, bg, ts, W, H, cam, particles, toastTimer, alive = true;
  let beasts, zones, items, hearts, maxHearts = 3, bones, inv, noseSat, superNose, waspT;
  const losses = {};
  // changer de mode en pleine affaire : on ajuste les cœurs sans repartir de zéro
  function changeMode() {
    if (!world) return;
    const nm = mode().hearts;
    hearts = Math.max(1, Math.min(nm, hearts + nm - maxHearts));
    maxHearts = nm;
    hudKey = '';
    paintHud();
  }

  // --- bouton Flairer (maintenu) + clavier ---
  let sniffHeld = false, keyHeld = false;
  const press = e => { e.preventDefault(); sniffHeld = true; sniffBtn.classList.add('on'); };
  const release = () => { sniffHeld = false; sniffBtn.classList.remove('on'); };
  sniffBtn.addEventListener('pointerdown', press);
  sniffBtn.addEventListener('pointerup', release);
  sniffBtn.addEventListener('pointercancel', release);
  sniffBtn.addEventListener('pointerleave', release);
  sniffBtn.addEventListener('contextmenu', e => e.preventDefault());
  const kd = e => { if (e.key === ' ' || e.key === 'Shift') { keyHeld = true; e.preventDefault(); } };
  const ku = e => { if (e.key === ' ' || e.key === 'Shift') keyHeld = false; };
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);

  function load(n, withIntro = true) {
    li = n; save.last = n; set(SAVE_KEY, save);
    C = CASES[n];
    world = buildCase(C);
    talya = { x: world.start[0] + 0.5, y: world.start[1] + 0.5, a: -Math.PI / 2, moving: false, ears: 1 };
    objects = world.objects.map(o => ({ ...o, x: o.at[0] + 0.5, y: o.at[1] + 0.5, gone: false }));
    trails = world.trails.map((t, k) => ({ ...t, k, gone: false, len: (t.pts.length - 1) * 0.25 }));
    time = 0; penalty = 0; wrong = 0; breath = 1; lock = false; sniffing = false; flair = 0; sinceSniff = 9;
    particles = []; bg = null; cam = { x: talya.x, y: talya.y };
    ({ beasts, zones, items } = spawn(world, n, C.seed));
    maxHearts = mode().hearts; hearts = maxHearts; bones = 0; inv = 0; noseSat = 0; superNose = 0; waspT = 0; hudKey = '';
    state = 'intro';
    levelEl.innerHTML = '';
    levelEl.append(h('small', {}, `Affaire ${n + 1} sur ${COUNT}`), C.name);
    chipEl.innerHTML = glyphSVG(C.scent[0], C.scent[1], 22);
    hintEl.textContent = C.hint;
    stick.reset();
    paintHud();
    if (withIntro) intro(); else state = 'play';
  }

  function intro() {
    let close;
    close = sheet([
      h('p', { class: 'fl-case' }, `Affaire n°${li + 1}`),
      h('h2', {}, C.name),
      h('p', {}, C.intro),
      h('div', { class: 'fl-sample' }, h('span', { class: 'fl-sample-g', html: glyphSVG(C.scent[0], C.scent[1], 34) }),
        h('div', {}, h('b', {}, 'Odeur à suivre'), h('span', {}, `Des ${plural(C.scent[0])} de cette couleur. Les autres odeurs mènent ailleurs.`))),
      h('p', { class: 'fl-danger' }, dangerLine(li, mode().hearts)),
      h('p', { class: 'fl-rule' }, `Pas de limite de temps : le chrono sert à te classer. Si tu suis une fausse piste jusqu’au bout, ${PENALTY} secondes de pénalité s’ajoutent à ton temps.`),
      h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onclick: () => { close(); state = 'play'; } }, 'Renifler')),
    ], 'fl-sheet');
  }

  let hudKey = '';
  function paintHud() {
    const key = [hearts, bones, Math.ceil(noseSat), Math.ceil(superNose)].join('|');
    if (key === hudKey) { timeEl.textContent = (time + penalty).toFixed(1).replace('.', ','); return; }
    hudKey = key;
    timeEl.textContent = (time + penalty).toFixed(1).replace('.', ',');
    heartsEl.innerHTML = Array.from({ length: maxHearts }, (_, k) => k).map(k => `<span class="${k < hearts ? 'on' : ''}">${HEART}</span>`).join('');
    const total = items.filter(i => i.kind === 'bone').length;
    bonesEl.innerHTML = `${BONE}<b>${bones}</b>/${total}`;
    powerEl.textContent = noseSat > 0 ? `Nez saturé ${Math.ceil(noseSat)} s` : superNose > 0 ? `Super-truffe ${Math.ceil(superNose)} s` : '';
    powerEl.className = 'fl-power' + (noseSat > 0 ? ' bad' : superNose > 0 ? ' good' : '');
  }

  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2200);
  }

  // --- décor pré-rendu ---
  function buildBackground() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = document.createElement('canvas');
    c.width = Math.ceil(world.w * ts * dpr); c.height = Math.ceil(world.h * ts * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const R = rng(C.seed + 99);
    for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
      const t = world.at(x, y), px = x * ts, py = y * ts;
      const v = R();
      g.fillStyle = t === ',' ? `hsl(150 22% ${15 + v * 2}%)` : `hsl(152 30% ${10 + v * 2.2}%)`;
      g.fillRect(px, py, ts + 0.5, ts + 0.5);
      if (t === '.' || t === ',') {
        g.strokeStyle = t === ',' ? 'rgba(170,210,180,.10)' : 'rgba(150,200,160,.08)';
        g.lineWidth = 1;
        for (let k = 0; k < 4; k++) {
          const gx = px + R() * ts, gy = py + R() * ts;
          g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + (R() - 0.5) * 3, gy - 3 - R() * 3); g.stroke();
        }
      }
      if (t === '~') {
        g.fillStyle = '#10303b'; g.fillRect(px, py, ts + 0.5, ts + 0.5);
        g.strokeStyle = 'rgba(160,220,240,.16)'; g.lineWidth = 1.2;
        for (let k = 0; k < 2; k++) { const yy = py + ts * (0.3 + k * 0.4) + (R() - 0.5) * 4; g.beginPath(); g.moveTo(px + 3, yy); g.quadraticCurveTo(px + ts / 2, yy - 3, px + ts - 3, yy); g.stroke(); }
      }
    }
    for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
      const t = world.at(x, y), cx = (x + 0.5) * ts, cy = (y + 0.5) * ts;
      if (t === 'b') {
        for (let k = 0; k < 4; k++) {
          g.fillStyle = k === 3 ? '#2f6a49' : '#24543a';
          g.beginPath(); g.arc(cx + (R() - 0.5) * ts * 0.5, cy + (R() - 0.5) * ts * 0.5, ts * (0.2 + R() * 0.1), 0, Math.PI * 2); g.fill();
        }
      } else if (t === 'R') {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(cx + 2, cy + 3, ts * 0.38, ts * 0.3, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#59605c';
        g.beginPath();
        for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2, r = ts * (0.3 + R() * 0.1); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85); }
        g.closePath(); g.fill();
        g.fillStyle = '#717874'; g.beginPath(); g.ellipse(cx - ts * 0.06, cy - ts * 0.08, ts * 0.17, ts * 0.11, -0.4, 0, Math.PI * 2); g.fill();
      }
    }
    // arbres : couronnes vues du dessus, qui débordent sur les cases voisines
    for (let y = 0; y < world.h; y++) for (let x = 0; x < world.w; x++) {
      if (world.at(x, y) !== 'T') continue;
      const cx = (x + 0.5) * ts + (R() - 0.5) * ts * 0.2, cy = (y + 0.5) * ts + (R() - 0.5) * ts * 0.2, r = ts * (0.56 + R() * 0.14);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(cx + 3, cy + 4, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = `hsl(${148 + R() * 14} 38% ${8 + R() * 3}%)`; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = `hsl(${148 + R() * 14} 34% ${13 + R() * 3}%)`; g.beginPath(); g.arc(cx - r * 0.2, cy - r * 0.22, r * 0.62, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(190,230,210,.07)'; g.beginPath(); g.arc(cx - r * 0.35, cy - r * 0.38, r * 0.3, 0, Math.PI * 2); g.fill();
    }
    bg = c;
  }

  // --- logique ---
  function step(dt) {
    if (state !== 'play') return;
    time += dt;
    // flair et souffle
    noseSat = Math.max(0, noseSat - dt);
    superNose = Math.max(0, superNose - dt);
    inv = Math.max(0, inv - dt);
    const want = (sniffHeld || keyHeld || (bot && bot.on)) && !lock && noseSat <= 0;
    sniffing = want && breath > 0;
    if (sniffing && superNose <= 0) { breath = Math.max(0, breath - dt / mode().breath); sinceSniff = 0; if (breath === 0) { lock = true; toast('Plus de flair pour l’instant. Il revient tout seul, attends un peu.'); } }
    else if (sniffing) sinceSniff = 0;
    // flairer dans le nuage d'une moufette sature le nez
    if (sniffing && !bot && zones.some(z => z.kind === 'skunk' && Math.hypot(z.x - talya.x, z.y - talya.y) < z.r)) {
      noseSat = 5; sniffing = false; sfx.wrong(); buzz(40); toast('Une moufette. Ton nez est saturé pour 5 secondes.');
    }
    else { sinceSniff += dt; if (sinceSniff > 0.5) breath = Math.min(1, breath + dt / 6); }
    if (lock && breath >= 0.3) lock = false;
    flair += ((sniffing ? 1 : 0) - flair) * Math.min(1, dt * (sniffing ? 9 : 1.1));
    breathEl.firstChild.style.width = (breath * 100).toFixed(1) + '%';
    breathEl.classList.toggle('low', lock || breath < 0.2);

    // déplacement
    const v = bot && bot.on ? botInput() : stick.get();
    const mag = Math.min(1, Math.hypot(v.x, v.y));
    if (mag > 0.05) {
      const slow = world.slow(Math.floor(talya.x), Math.floor(talya.y)) ? 0.55 : 1;
      const sp = SPEED * (0.35 + 0.65 * mag) * slow * (sniffing ? 0.62 : 1);
      [talya.x, talya.y] = moveCircle(world.solid, talya.x, talya.y, 0.3, v.x * sp * dt, v.y * sp * dt);
      talya.a = lerpAngle(talya.a, Math.atan2(v.y, v.x), Math.min(1, dt * 12));
      talya.moving = true;
    } else talya.moving = false;
    talya.ears += (1 - talya.ears) * Math.min(1, dt * 2);

    // bêtes et guêpes
    const events = [];
    const hit = updateBeasts(world, beasts, talya, dt, events, mode());
    for (const [kind] of events) { if (kind === 'boar') sfx.alarm(); else if (kind === 'fox') sfx.tick(); else if (kind === 'thud') buzz(20); }
    const safe = bot && !bot.hurt;
    if (hit && !inv && !safe) {
      // après une morsure, le renard file et le sanglier reste sonné : pas d'acharnement
      if (hit.kind === 'fox') { hit.state = 'idle'; hit.cool = 4; hit.t = 0; hit.a += Math.PI; }
      if (hit.kind === 'boar') { hit.state = 'stun'; hit.t = 0; }
      hurt(NAMES[hit.kind], hit.x, hit.y);
    }
    if (state !== 'play') return;
    waspT = Math.max(0, waspT - dt);
    const wasp = zones.find(z => z.kind === 'wasps' && Math.hypot(z.x - talya.x, z.y - talya.y) < z.r);
    if (wasp && !inv && !waspT && !safe) { waspT = 1.2; hurt(NAMES.wasps, wasp.x, wasp.y); if (state !== 'play') return; }
    // bonus
    for (const it of items) {
      if (it.taken || Math.hypot(it.x - talya.x, it.y - talya.y) > 0.6) continue;
      it.taken = true;
      buzz(12);
      if (it.kind === 'treat') { breath = 1; lock = false; sfx.place(); toast('Une friandise : ton flair est rechargé à fond.'); }
      else if (it.kind === 'bone') { bones++; sfx.lit(bones); toast(`Os doré ${bones} sur ${items.filter(i => i.kind === 'bone').length}.`); }
      else if (it.kind === 'nose') { superNose = 7; noseSat = 0; breath = 1; lock = false; sfx.win(); toast('Super-truffe : 7 secondes de flair illimité, et plus loin.'); }
      for (let k = 0; k < 16; k++) particles.push({ x: it.x, y: it.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 0.8, c: it.kind === 'bone' ? '#f2c14e' : it.kind === 'nose' ? '#ff8cc8' : '#e8c27a' });
    }

    // objets
    for (const o of objects) {
      if (o.gone || Math.hypot(o.x - talya.x, o.y - talya.y) > 0.7) continue;
      if (o.real) return found(o);
      o.gone = true;
      const t = trails.find(tr => !tr.main && !tr.gone && Math.hypot(tr.pts[tr.pts.length - 1][0] - o.x, tr.pts[tr.pts.length - 1][1] - o.y) < 1);
      if (t) t.gone = true;
      wrong++; penalty += PENALTY;
      sfx.wrong(); buzz(50); talya.ears = 0.2;
      const name = OBJECTS[o.kind].name;
      toast(`${cap(name)} : fausse piste. Pénalité de ${PENALTY} secondes sur ton temps.`);
      penEl.textContent = `+${PENALTY} s`; penEl.classList.remove('pop'); void penEl.offsetWidth; penEl.classList.add('pop');
    }
    paintHud();
  }

  function hurt(name, fx, fy) {
    hearts--; inv = 1.6;
    // petit recul, loin de ce qui a mordu ou piqué
    const a = Math.atan2(talya.y - fy, talya.x - fx);
    [talya.x, talya.y] = moveCircle(world.solid, talya.x, talya.y, 0.3, Math.cos(a) * 0.9, Math.sin(a) * 0.9);
    talya.ears = 0.15;
    sfx.wrong(); buzz(70);
    paintHud();
    if (hearts <= 0) return lost(name);
    toast(`${cap(name)} ! Il te reste ${hearts} cœur${hearts > 1 ? 's' : ''}.`);
  }

  function lost(name) {
    state = 'lost';
    losses[li] = (losses[li] || 0) + 1;
    setTimeout(() => {
      let close;
      const offerEasy = losses[li] >= 3 && getMode('flair') !== 'facile';
      close = sheet([
        h('p', { class: 'fl-case' }, `Affaire n°${li + 1}`),
        h('h2', {}, 'Talya rentre bredouille.'),
        h('p', {}, `C’est ${name} qui a eu le dernier mot. Elle boude dans son panier, mais elle reviendra.`),
        offerEasy ? h('div', { class: 'easy-offer' },
          h('b', {}, 'Passer en mode facile ?'),
          h('span', {}, 'Pas de jugement. Cinq cœurs, des bêtes plus lentes et un flair qui dure plus longtemps. Tu peux changer de mode à tout moment.'),
          h('button', { class: 'btn', type: 'button', onclick: () => { setMode('flair', 'facile'); modeEl.refresh(); close(); load(li, false); } }, 'Oui, mode facile')) : null,
        h('div', { class: 'actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => { close(); load(li, false); } }, 'Recommencer'),
          h('a', { class: 'btn ghost', href: '#/missions' }, 'Retour aux missions')),
      ], 'fl-sheet');
    }, reducedMotion() ? 100 : 700);
  }

  function found(o) {
    state = 'found';
    sfx.win(); buzz(30);
    for (let k = 0; k < 40; k++) particles.push({ x: o.x, y: o.y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: 1.2, c: C.scent[1] });
    const total = time + penalty;
    const prev = save.best[li];
    const allBones = bones >= items.filter(i => i.kind === 'bone').length;
    const perfect = wrong === 0 && hearts === maxHearts && allBones;
    if (!prev || total < prev.time) save.best[li] = { time: total, clean: perfect || (prev && prev.clean) };
    else if (perfect) save.best[li].clean = true;
    set(SAVE_KEY, save);
    const target = Math.round(world.length / SPEED * 1.7 + 8);
    const last = li === COUNT - 1;
    setTimeout(() => {
      let close;
      const go = n => { close(); load(n); };
      close = sheet([
        h('p', { class: 'fl-case' }, `Affaire n°${li + 1} résolue`),
        h('h2', {}, last ? 'Joyeux anniversaire, Florian.' : `${cap(OBJECTS[o.kind].name)}.`),
        h('p', {}, last
          ? 'Talya a retrouvé le cadeau avant toi. Elle ne l’a presque pas mâchouillé.'
          : perfect ? 'Affaire parfaite : aucune fausse piste, aucune égratignure, tous les os.' : wrong === 0 ? 'Sans une seule fausse piste. Le nez le plus fin de la forêt.' : `Retrouvé, après ${wrong} détour${wrong > 1 ? 's' : ''} gourmand${wrong > 1 ? 's' : ''}.`),
        h('div', { class: 'stat-row' },
          h('div', { class: 'stat' }, h('b', {}, total.toFixed(1).replace('.', ',') + ' s'), h('span', {}, (total <= target ? 'objectif tenu' : `objectif ${target} s`) + (penalty ? `, dont ${penalty} s de pénalités` : ''))),
          h('div', { class: 'stat' }, h('b', {}, `${bones}/${items.filter(i => i.kind === 'bone').length}`), h('span', {}, 'os dorés')),
          h('div', { class: 'stat' }, h('b', {}, hearts), h('span', {}, hearts > 1 ? 'cœurs restants' : 'cœur restant')),
          h('div', { class: 'stat' }, h('b', {}, wrong), h('span', {}, wrong === 1 ? 'fausse piste' : 'fausses pistes')),
          prev ? h('div', { class: 'stat' }, h('b', {}, Math.min(prev.time, total).toFixed(1).replace('.', ',') + ' s'), h('span', {}, 'record')) : null),
        h('div', { class: 'actions' },
          last ? nextMissionButton('flair', true) : h('button', { class: 'btn', type: 'button', onclick: () => go(li + 1) }, 'Affaire suivante'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => go(li) }, 'Rejouer'),
          last ? h('a', { class: 'btn ghost', href: '#/missions' }, 'Retour aux missions') : null),
      ], 'fl-sheet');
    }, reducedMotion() ? 150 : 1100);
  }

  function openLevels() {
    let close;
    close = sheet([
      h('h2', {}, 'Affaires'),
      h('p', {}, 'Un point violet : affaire parfaite (aucune fausse piste, aucun cœur perdu, tous les os).'),
      h('div', { class: 'lv-grid' }, CASES.map((c, n) => {
        const b = save.best[n];
        return h('button', {
          class: ['lv', 'fl-lv', b ? 'done' : '', b && b.clean ? 'perfect' : '', n === li ? 'current' : ''].join(' '),
          type: 'button', disabled: !isOpen(n), 'aria-label': `Affaire ${n + 1}, ${c.name}`, onclick: () => { close(); load(n); },
        }, n + 1);
      })),
      h('div', { class: 'actions' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => close() }, 'Fermer')),
    ], 'fl-sheet');
  }

  // --- rendu ---
  function frame(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const pw = W, ph = H;
    ({ W, H } = fitCanvas(canvas, ctx));
    const nts = Math.round(Math.max(30, Math.min(46, W / 10)));
    if (!bg || nts !== ts || W !== pw || H !== ph) { ts = nts; buildBackground(); }
    step(dt);

    // caméra qui suit Talya, bornée aux limites de la forêt
    const vw = W / ts, vh = H / ts;
    const tx = Math.max(vw / 2, Math.min(world.w - vw / 2, talya.x)), ty = Math.max(vh / 2, Math.min(world.h - vh / 2, talya.y - vh * 0.08));
    cam.x += (tx - cam.x) * Math.min(1, dt * 6); cam.y += (ty - cam.y) * Math.min(1, dt * 6);
    if (world.w < vw) cam.x = world.w / 2;
    if (world.h < vh) cam.y = world.h / 2;
    const ox = W / 2 - cam.x * ts, oy = H / 2 - cam.y * ts;
    const sx = x => ox + x * ts, sy = y => oy + y * ts;

    ctx.fillStyle = '#081410'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(bg, ox, oy, world.w * ts, world.h * ts);
    for (const z of zones) drawZone(ctx, z, sx(z.x), sy(z.y), ts, now);
    for (const it of items) if (!it.taken) drawItem(ctx, it, sx(it.x), sy(it.y), ts, now);
    for (const o of objects) if (!o.gone) drawObject(ctx, o.kind, sx(o.x), sy(o.y), ts, now);
    for (const b of beasts) drawBeast(ctx, b, sx(b.x), sy(b.y), ts, now);
    if (!(inv > 0 && Math.floor(now / 90) % 2)) drawTalyaTop(ctx, sx(talya.x), sy(talya.y), talya.a, ts * 0.95, now, talya.moving, { ears: talya.ears, sniff: sniffing });

    // nuit : seule une petite zone autour de Talya est éclairée
    const px = sx(talya.x), py = sy(talya.y);
    const inner = ts * (2.3 - flair * 0.6), outer = ts * (6.6 - flair * 1.6);
    const dark = ctx.createRadialGradient(px, py, inner, px, py, outer);
    dark.addColorStop(0, 'rgba(3,8,10,0)');
    dark.addColorStop(1, `rgba(3,8,10,${0.8 + flair * 0.1})`);
    ctx.fillStyle = dark; ctx.fillRect(0, 0, W, H);
    if (flair > 0.01) { ctx.fillStyle = `rgba(10,6,30,${flair * 0.22})`; ctx.fillRect(0, 0, W, H); }
    if (noseSat > 0) { ctx.fillStyle = `rgba(120,170,60,${Math.min(0.22, noseSat * 0.06)})`; ctx.fillRect(0, 0, W, H); }
    // les yeux des bêtes brillent dans le noir
    for (const b of beasts) drawEyes(ctx, b, sx(b.x), sy(b.y), ts, now, Math.hypot(b.x - talya.x, b.y - talya.y));
    // au flair, les os dorés et les friandises scintillent
    if (flair > 0.05) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const it of items) {
        if (it.taken) continue;
        const d = Math.hypot(it.x - talya.x, it.y - talya.y), R = SCENT_R * (superNose > 0 ? 1.6 : 1);
        if (d > R) continue;
        const a = flair * (1 - d / R) * (0.6 + 0.4 * Math.sin(now / 160 + it.x));
        const col = it.kind === 'bone' ? '#f2c14e' : it.kind === 'nose' ? '#ff8cc8' : '#e8c27a';
        drawGlyph(ctx, 'star', col, sx(it.x), sy(it.y), ts * 0.12, a, 0);
      }
      ctx.restore();
    }

    // odeurs
    if (flair > 0.01) drawScents(ctx, sx, sy, now);
    particles = particles.filter(p => (p.life -= dt) > 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; ctx.fillStyle = hexA(p.c, p.life / 1.2); ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    stick.draw(ctx);
    raf = requestAnimationFrame(frame);
  }

  function drawScents(g, sx, sy, now) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    const flow = (now / 1000) * 0.9;
    for (const t of trails) {
      if (t.gone) continue;
      const n = Math.floor(t.len / SPACING);
      for (let k = 0; k <= n; k++) {
        const s = k * SPACING + (flow % SPACING);
        const f = s / 0.25, i = Math.floor(f);
        if (i >= t.pts.length - 1) continue;
        if (!t.dry[i]) continue;
        const a = t.pts[i], b = t.pts[i + 1], fr = f - i;
        const x = a[0] + (b[0] - a[0]) * fr, y = a[1] + (b[1] - a[1]) * fr;
        const d = Math.hypot(x - talya.x, y - talya.y);
        const RS = SCENT_R * (superNose > 0 ? 1.6 : 1);
        if (d > RS) continue;
        // l'odeur est plus forte près de Talya, et s'estompe aux deux bouts de la portée
        const alpha = flair * Math.pow(1 - d / RS, 0.7);
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        drawGlyph(g, t.shape, t.color, sx(x), sy(y), ts * 0.15, alpha, ang);
      }
    }
    g.restore();
  }

  // --- pilote de test (?bot) : flaire en continu et suit la vraie piste ---
  let bot = null;
  if (/[?&]bot\b/.test(location.search)) bot = { on: true, i: 0, hurt: /bot=hurt/.test(location.search) };
  function botInput() {
    const pts = trails[0].pts;
    while (bot.i < pts.length - 1 && Math.hypot(pts[bot.i][0] - talya.x, pts[bot.i][1] - talya.y) < 0.9) bot.i++;
    const [x, y] = pts[Math.min(pts.length - 1, bot.i)];
    const dx = x - talya.x, dy = y - talya.y, d = Math.hypot(dx, dy) || 1;
    return { x: dx / d, y: dy / d };
  }
  window.__fl = { get state() { return state; }, get time() { return time; }, get wrong() { return wrong; }, get hearts() { return hearts; }, start: () => { document.querySelectorAll('.overlay').forEach(o => o.remove()); state = 'play'; }, load: n => { load(n); if (bot) bot.i = 0; } };

  let raf = 0, last = performance.now();
  load(li);
  raf = requestAnimationFrame(frame);
  return {
    unmount() {
      alive = false; cancelAnimationFrame(raf); stick.destroy(); clearTimeout(toastTimer);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
    },
  };
}

const HEART = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3 1.6-1.8 3-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>';
const BONE = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 9.5a2.5 2.5 0 1 1 2.5-3.2l5 5a2.5 2.5 0 1 1 3.2 2.5 2.5 2.5 0 1 1-3.2 2.5l-5-5A2.5 2.5 0 1 1 7 9.5z" fill="currentColor"/></svg>';
const DANGER_NAMES = { hedgehog: ['un hérisson', 'des hérissons'], fox: ['un renard', 'des renards'], wasps: ['un nid de guêpes', 'des guêpes'], skunk: ['une moufette', 'des moufettes'], boar: ['un sanglier', 'des sangliers'] };
function dangerLine(n, hearts = 3) {
  const c = THREATS[n];
  const list = Object.keys(DANGER_NAMES).filter(k => c[k] > 0).map(k => DANGER_NAMES[k][c[k] > 1 ? 1 : 0]);
  const last = list.pop();
  const words = { 2: 'Deux', 3: 'Trois', 5: 'Cinq' };
  return `Cette nuit dans la forêt : ${list.length ? list.join(', ') + ' et ' : ''}${last}. ${words[hearts] || hearts} cœurs, pas un de plus.`;
}

// --- dessins ---
const PLURALS = { dot: 'ronds', diamond: 'losanges', tri: 'triangles', square: 'carrés', star: 'étoiles' };
const plural = s => PLURALS[s];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}

function glyphPath(g, shape, x, y, r) {
  g.beginPath();
  if (shape === 'dot') g.arc(x, y, r, 0, Math.PI * 2);
  else if (shape === 'square') g.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
  else if (shape === 'diamond') { g.moveTo(x, y - r * 1.2); g.lineTo(x + r, y); g.lineTo(x, y + r * 1.2); g.lineTo(x - r, y); }
  else if (shape === 'tri') { g.moveTo(x, y - r * 1.15); g.lineTo(x + r * 1.05, y + r * 0.8); g.lineTo(x - r * 1.05, y + r * 0.8); }
  else if (shape === 'star') {
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.5 : r * 1.25; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  }
  g.closePath();
}

function drawGlyph(g, shape, color, x, y, r, alpha, ang) {
  if (alpha <= 0.01) return;
  const glow = g.createRadialGradient(x, y, 0, x, y, r * 3.2);
  glow.addColorStop(0, hexA(color, alpha * 0.45));
  glow.addColorStop(1, hexA(color, 0));
  g.fillStyle = glow;
  g.beginPath(); g.arc(x, y, r * 3.2, 0, Math.PI * 2); g.fill();
  g.save();
  g.translate(x, y);
  if (shape === 'tri') g.rotate(ang + Math.PI / 2);
  g.fillStyle = hexA(color, Math.min(1, alpha * 1.3));
  glyphPath(g, shape, 0, 0, r);
  g.fill();
  g.restore();
}

function glyphSVG(shape, color, size) {
  const c = document.createElement('canvas');
  const dpr = 2;
  c.width = c.height = size * dpr;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  g.fillStyle = color;
  glyphPath(g, shape, size / 2, size / 2, size * 0.3);
  g.fill();
  return `<img src="${c.toDataURL()}" width="${size}" height="${size}" alt="${PLURALS[shape]}">`;
}

function drawObject(g, kind, x, y, ts, now) {
  const s = ts / 34;
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(1, 6, 9, 3.5, 0, 0, Math.PI * 2); g.fill();
  const col = OBJECTS[kind].color;
  switch (kind) {
    case 'ball':
      g.fillStyle = col; g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 1.4; g.beginPath(); g.arc(-7.5, 0, 5.5, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(7.5, 0, 5.5, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
      break;
    case 'keys':
      g.strokeStyle = col; g.lineWidth = 2.2; g.beginPath(); g.arc(-4, -3, 4, 0, Math.PI * 2); g.stroke();
      g.fillStyle = col; g.fillRect(-1, -4, 11, 2.4); g.fillRect(6, -4, 2, 5); g.fillRect(9, -4, 2, 4);
      g.fillStyle = '#9fb0b5'; g.fillRect(-6, 1, 9, 2); g.fillRect(-1, 1, 2, 4);
      break;
    case 'sandwich':
      g.fillStyle = col; g.beginPath(); g.moveTo(-8, 6); g.lineTo(8, 6); g.lineTo(0, -8); g.closePath(); g.fill();
      g.fillStyle = '#7fbf5a'; g.fillRect(-6, 2, 12, 2);
      break;
    case 'sock':
      g.rotate(-0.4);
      g.fillStyle = col; g.beginPath(); g.moveTo(-3, -9); g.lineTo(3, -9); g.lineTo(3, 2); g.quadraticCurveTo(10, 3, 9, 7); g.quadraticCurveTo(6, 10, 0, 7); g.lineTo(-3, 4); g.closePath(); g.fill();
      g.fillStyle = '#c0533b'; g.fillRect(-3, -9, 6, 2.5);
      break;
    case 'gift': {
      const p = 1 + Math.sin(now / 300) * 0.04;
      g.scale(p, p);
      g.fillStyle = col; g.fillRect(-8, -6, 16, 13);
      g.fillStyle = '#e3b04b'; g.fillRect(-1.5, -6, 3, 13); g.fillRect(-8, -0.5, 16, 3);
      g.beginPath(); g.ellipse(-3, -8, 3.5, 2.2, -0.4, 0, Math.PI * 2); g.ellipse(3, -8, 3.5, 2.2, 0.4, 0, Math.PI * 2); g.fill();
      break;
    }
    case 'sausage':
      g.fillStyle = col; g.beginPath(); g.roundRect(-9, -3.5, 18, 7, 3.5); g.fill();
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-6, -2.5, 10, 1.4);
      break;
    case 'cone':
      g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, 5.5, 8, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
      for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(-5, k * 3); g.lineTo(5, k * 3 + 2); g.stroke(); }
      break;
    case 'glove':
      g.fillStyle = col; g.beginPath(); g.roundRect(-6, -2, 11, 9, 3); g.fill();
      for (let k = 0; k < 4; k++) { g.beginPath(); g.roundRect(-5.5 + k * 2.7, -8, 2.2, 7, 1.1); g.fill(); }
      g.beginPath(); g.roundRect(5, 0, 5, 2.4, 1.2); g.fill();
      break;
    case 'bone':
      g.fillStyle = col; g.fillRect(-6, -1.6, 12, 3.2);
      for (const sx of [-6, 6]) for (const sy of [-2, 2]) { g.beginPath(); g.arc(sx, sy, 2.6, 0, Math.PI * 2); g.fill(); }
      break;
  }
  g.restore();
}
