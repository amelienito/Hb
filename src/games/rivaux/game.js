// Rivaux Marvel : 60 secondes de duels « lequel des deux ? » contre un fantôme.
// La difficulté monte avec la série : plus tu enchaînes, plus les écarts se resserrent.
import { h, backButton, soundButton, sheet, fmt, buzz, reducedMotion } from '../../core/ui.js';
import { nextMissionButton } from '../../core/nav.js';
import { get, set } from '../../core/store.js';
import { sfx } from '../../core/sound.js';
import { FILMS, HEROES, FAMILIES, MCU_DEBUTS, CAST, RT, RT_TOL, OPENING, PHASE, CREDITS, CHRONO, STONES, APPEARANCES } from './data.js';

const DURATION = 60000;
const PENALTY = 5000;

const FEM = new Set(['Gwyneth Paltrow', 'Tessa Thompson', 'Cate Blanchett', 'Scarlett Johansson', 'Florence Pugh', 'Tatiana Maslany', 'Letitia Wright', 'Brie Larson', 'Iman Vellani', 'Elizabeth Olsen', 'Zoe Saldaña', 'Karen Gillan', 'Vanessa Kirby']);
const money = m => (m >= 1000 ? (m / 1000).toFixed(2).replace('.', ',') + ' Md$' : m + ' M$');

// Chaque catégorie a un niveau : les questions pointues arrivent quand la série monte.
// tier 0 = grand public, 1 = fan, 2 = expert.
const filmItems = (fn, kind) => FILMS.map((f, i) => fn(f, i)).filter(Boolean).map(o => ({ kind, ...o }));
const CATS = {
  box: {
    w: 0.8, tier: 0, label: 'Box-office mondial',
    items: FILMS.map(f => ({ name: f[0], kind: 'Film, ' + f[1], fam: f[2], v: f[3], show: money(f[3]), sub: 'Au box-office ?' })),
    ask: up => (up ? 'Quel film a <em>le plus</em> rapporté dans le monde ?' : 'Quel film a <em>le moins</em> rapporté dans le monde ?'),
    short: up => (up ? 'Plus gros box-office' : 'Plus petit box-office'),
    far: (a, b, s) => Math.max(a.v, b.v) / Math.min(a.v, b.v) >= Math.max(1.12, 1.9 - s * 0.08),
  },
  dur: {
    w: 0.8, tier: 0, label: 'Durée en salle',
    items: FILMS.map(f => ({ name: f[0], kind: 'Film, ' + f[1], fam: f[2], v: f[4], show: f[4] + ' min', sub: 'Combien de temps ?' })),
    ask: up => (up ? 'Quel film est <em>le plus long</em> ?' : 'Quel film est <em>le plus court</em> ?'),
    short: up => (up ? 'Plus long' : 'Plus court'),
    far: (a, b, s) => Math.abs(a.v - b.v) >= Math.max(6, 28 - s * 2.5),
  },
  year: {
    w: 0.7, tier: 0, label: 'Sorties en salle',
    items: FILMS.map(f => ({ name: f[0], kind: 'Film', fam: f[2], v: -f[1], show: String(f[1]), sub: 'Sorti quand ?' })),
    ask: up => (up ? 'Quel film est sorti <em>en premier</em> au cinéma ?' : 'Quel film est sorti <em>le plus tard</em> au cinéma ?'),
    short: up => (up ? 'Sorti en premier' : 'Sorti plus tard'),
    far: (a, b, s) => Math.abs(a.v - b.v) >= Math.max(1, 6 - s * 0.5),
  },
  rt: {
    w: 1, tier: 0, label: 'Note des critiques (Rotten Tomatoes)',
    items: filmItems((f, i) => ({ name: f[0], fam: f[2], v: RT[i], tol: RT_TOL[i] || 0, show: RT[i] + ' %', sub: 'Aimé des critiques ?' }), 'Film'),
    ask: up => (up ? 'Quel film a la <em>meilleure</em> note des critiques ?' : 'Quel film a la note des critiques <em>la plus basse</em> ?'),
    short: up => (up ? 'Mieux noté' : 'Moins bien noté'),
    far: (a, b, s) => Math.abs(a.v - b.v) >= Math.max(3, 15 - s * 1.2) + a.tol + b.tol,
  },
  cast: {
    w: 0.8, tier: 0, label: 'Le casting (années de naissance)',
    items: CAST.map(c => ({ name: c[0], kind: 'Interprète de ' + c[2], fam: c[3], v: -c[1], show: 'né' + (FEM.has(c[0]) ? 'e' : '') + ' en ' + c[1], sub: 'Quel âge ?' })),
    ask: up => (up ? 'Qui est <em>le plus âgé</em> des deux ?' : 'Qui est <em>le plus jeune</em> des deux ?'),
    short: up => (up ? 'Plus âgé' : 'Plus jeune'),
    far: (a, b, s) => Math.abs(a.v - b.v) >= Math.max(2, 12 - s),
  },
  comic: {
    w: 1, tier: 1, label: 'Premières apparitions dans les comics',
    items: HEROES.map(c => ({ name: c[0], kind: 'Personnage de comics', fam: c[3], v: c[1], show: String(c[1]), small: c[2], sub: 'Né quand, sur papier ?' })),
    ask: up => (up ? 'Quel personnage est apparu <em>le plus tard</em> dans les comics ?' : 'Quel personnage est apparu <em>en premier</em> dans les comics ?'),
    short: up => (up ? 'Apparu plus tard en comics' : 'Apparu en premier en comics'),
    far: (a, b, s) => Math.abs(a.v - b.v) >= Math.max(1, 14 - s * 1.2),
  },
  mcu: {
    w: 1, tier: 1, label: 'Arrivées au cinéma (MCU)',
    items: MCU_DEBUTS.map(c => ({ name: c[0], kind: 'Personnage du MCU', fam: c[3], v: c[1], show: String(c[1]), small: c[2], sub: 'Arrivé quand au cinéma ?' })),
    ask: up => (up ? 'Quel personnage est arrivé <em>le plus tard</em> dans les films du MCU ?' : 'Quel personnage est arrivé <em>en premier</em> dans les films du MCU ?'),
    short: up => (up ? 'Arrivé plus tard au cinéma' : 'Arrivé en premier au cinéma'),
    far: (a, b, s) => Math.abs(a.v - b.v) >= Math.max(1, 5 - s * 0.4),
  },
  apps: {
    w: 0.9, tier: 1, label: 'Nombre de films (caméos compris)',
    items: APPEARANCES.map(c => ({ name: c[0], kind: 'Personnage du MCU', fam: c[3], v: c[1], tol: c[2], show: c[1] + ' films', sub: 'Combien de films ?' })),
    ask: up => (up ? 'Qui apparaît dans <em>le plus</em> de films du MCU, caméos compris ?' : 'Qui apparaît dans <em>le moins</em> de films du MCU, caméos compris ?'),
    short: up => (up ? 'Plus de films' : 'Moins de films'),
    far: (a, b, s) => Math.abs(a.v - b.v) >= Math.max(1, 4 - s * 0.3) + a.tol + b.tol,
  },
  phase: {
    w: 0.6, tier: 1, label: 'Les phases du MCU',
    items: filmItems((f, i) => ({ name: f[0], fam: f[2], v: PHASE[i], show: 'Phase ' + PHASE[i], sub: 'Quelle phase ?' }), 'Film'),
    ask: up => (up ? 'Quel film appartient à une phase <em>plus récente</em> ?' : 'Quel film appartient à une phase <em>plus ancienne</em> ?'),
    short: up => (up ? 'Phase plus récente' : 'Phase plus ancienne'),
    far: (a, b, s) => Math.abs(a.v - b.v) >= (s > 6 ? 1 : 2),
  },
  chrono: {
    w: 1, tier: 2, label: 'Chronologie interne du MCU',
    items: filmItems((f, i) => CHRONO[i] && ({ name: f[0], fam: f[2], v: -CHRONO[i][0], tol: CHRONO[i][1], show: CHRONO[i][2], sub: 'Ça se passe quand ?' }), 'Film'),
    ask: up => (up ? 'Quel film se déroule <em>en premier</em> dans la chronologie du MCU ?' : 'Quel film se déroule <em>le plus tard</em> dans la chronologie du MCU ?'),
    short: up => (up ? 'Se déroule en premier' : 'Se déroule plus tard'),
    far: (a, b, s) => Math.abs(a.v - b.v) > Math.max(0.04, 3 - s * 0.3) + a.tol + b.tol,
  },
  open: {
    w: 0.6, tier: 2, label: 'Premier week-end (États-Unis et Canada)',
    items: filmItems((f, i) => OPENING[i] != null && ({ name: f[0], fam: f[2], v: OPENING[i], show: String(OPENING[i]).replace('.', ',') + ' M$', sub: 'Démarrage en salle ?' }), 'Film, ' + ''),
    ask: up => (up ? 'Quel film a fait le <em>meilleur</em> premier week-end aux États-Unis ?' : 'Quel film a fait le premier week-end <em>le plus faible</em> aux États-Unis ?'),
    short: up => (up ? 'Meilleur démarrage' : 'Démarrage plus faible'),
    far: (a, b, s) => Math.max(a.v, b.v) / Math.min(a.v, b.v) >= Math.max(1.12, 1.7 - s * 0.06),
  },
  credits: {
    w: 0.5, tier: 2, label: 'Scènes pendant et après le générique',
    items: filmItems((f, i) => CREDITS[i] != null && ({ name: f[0], fam: f[2], v: CREDITS[i], show: CREDITS[i] === 0 ? 'aucune' : CREDITS[i] + (CREDITS[i] > 1 ? ' scènes' : ' scène'), sub: 'Combien de scènes bonus ?' }), 'Film'),
    ask: up => (up ? 'Quel film a <em>le plus</em> de scènes pendant ou après le générique ?' : 'Quel film a <em>le moins</em> de scènes pendant ou après le générique ?'),
    short: up => (up ? 'Plus de scènes de générique' : 'Moins de scènes de générique'),
    far: (a, b) => Math.abs(a.v - b.v) >= 1,
  },
  stones: {
    w: 0.35, tier: 2, label: 'Pierres d’Infinité',
    items: STONES.map(c => ({ name: c[0], kind: 'Pierre d’Infinité', fam: c[3], v: -c[1], show: String(c[1]), small: c[2], sub: 'Vue quand à l’écran ?' })),
    ask: up => (up ? 'Quelle Pierre apparaît <em>en premier</em> à l’écran ?' : 'Quelle Pierre apparaît <em>le plus tard</em> à l’écran ?'),
    short: up => (up ? 'Vue en premier' : 'Vue plus tard'),
    far: (a, b) => Math.abs(a.v - b.v) >= 1,
  },
};
// les films du premier week-end n'affichent pas l'année (trop d'indice)
CATS.open.items.forEach(o => { o.kind = 'Film'; });
// pour les catégories « en premier », la plus grande valeur gagne quand up est vrai : on a déjà inversé le signe.
// Exception : comics et MCU gardent l'année telle quelle (up = « le plus tard »).
const TIER_WEIGHT = s => [Math.max(0.35, 1 - s * 0.07), 1, Math.min(1.8, 0.35 + s * 0.14)];

const EMBLEMS = {
  ring: '<circle cx="50" cy="50" r="40" fill="none" stroke="#fff" stroke-width="6"/><circle cx="50" cy="50" r="24" fill="none" stroke="#fff" stroke-width="4"/><polygon points="50,34 64,58 36,58" fill="#fff"/>',
  chevron: '<polygon points="50,8 92,92 72,92 50,46 28,92 8,92" fill="#fff"/>',
  bolt: '<polygon points="58,4 22,56 46,56 38,96 80,40 54,40" fill="#fff"/>',
  star: '<polygon points="50,6 61,38 95,38 67,58 78,92 50,72 22,92 33,58 5,38 39,38" fill="#fff"/>',
  fist: '<polygon points="50,6 90,28 90,72 50,94 10,72 10,28" fill="none" stroke="#fff" stroke-width="8"/>',
  planet: '<circle cx="50" cy="50" r="26" fill="#fff"/><ellipse cx="50" cy="50" rx="46" ry="14" fill="none" stroke="#fff" stroke-width="5" transform="rotate(-20 50 50)"/>',
  web: '<g fill="none" stroke="#fff" stroke-width="3"><circle cx="50" cy="50" r="14"/><circle cx="50" cy="50" r="28"/><circle cx="50" cy="50" r="42"/><path d="M50 4V96M4 50H96M17 17L83 83M83 17L17 83"/></g>',
  claw: '<g stroke="#fff" stroke-width="9" stroke-linecap="round"><path d="M22 12L44 88M44 8L64 90M66 12L84 84"/></g>',
  mandala: '<g fill="none" stroke="#fff" stroke-width="3"><circle cx="50" cy="50" r="42"/><circle cx="50" cy="50" r="30"/><rect x="29" y="29" width="42" height="42" transform="rotate(45 50 50)"/><rect x="29" y="29" width="42" height="42"/></g>',
  dot: '<circle cx="50" cy="50" r="42" fill="none" stroke="#fff" stroke-width="5"/><circle cx="50" cy="50" r="9" fill="#fff"/>',
  burst: '<polygon points="50,2 58,36 92,22 66,48 98,62 62,64 70,98 50,72 30,98 38,64 2,62 34,48 8,22 42,36" fill="#fff"/>',
  hourglass: '<polygon points="22,10 78,10 50,50" fill="#fff"/><polygon points="22,90 78,90 50,50" fill="#fff"/>',
  x: '<g stroke="#fff" stroke-width="16" stroke-linecap="round"><path d="M18 18L82 82M82 18L18 82"/></g>',
  four: '<circle cx="50" cy="50" r="42" fill="none" stroke="#fff" stroke-width="6"/><path d="M58 24V76M58 24L30 60H70" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>',
};

function mulberry(seed) {
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function points(streak, ms) {
  const mult = Math.min(5, 1 + Math.floor(streak / 3));
  const speed = ms < 1500 ? 50 : ms < 3000 ? 25 : 0;
  return 100 * mult + speed;
}

// Fantôme par défaut : un adversaire régulier, pas infaillible.
function defaultGhost() {
  const R = mulberry(25);
  const tl = [[0, 0]];
  let t = 0, score = 0, streak = 0;
  for (;;) {
    const ms = 1500 + R() * 1100;
    t += ms;
    if (t > DURATION) break;
    if (R() < 0.83) { streak++; score += points(streak - 1, ms); } else { streak = 0; t += PENALTY; }
    tl.push([Math.min(t, DURATION), score]);
  }
  return { name: 'Le Rival', score, tl };
}

function ghostAt(ghost, t) {
  let s = 0;
  for (const [at, sc] of ghost.tl) { if (at <= t) s = sc; else break; }
  return s;
}

export function mount(root) {
  root.classList.add('g-screen', 'rivaux');
  const save = get('rivaux', {});
  const ghost = save.ghost && save.ghost.tl ? save.ghost : defaultGhost();

  root.append(h('header', { class: 'g-bar' }, backButton(), h('div', { class: 'g-title' }, 'Rivaux Marvel'), soundButton()));
  const body = h('div', { class: 'rv-body', style: 'display:flex;flex-direction:column;flex:1' });
  root.append(body);

  let timers = [], raf = 0, alive = true, keyHandler = null;
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

  function intro() {
    body.innerHTML = '';
    body.append(h('div', { class: 'rv-intro' },
      h('div', { class: 'rv-intro-art', 'aria-hidden': 'true', html: `<svg viewBox="0 0 100 100">${EMBLEMS.ring}</svg>` }),
      h('h1', {}, 'Rivaux', h('br'), 'Marvel'),
      h('p', { class: 'lead' }, 'Deux noms, une question, une seconde pour trancher. Films, comics, casting, box-office : tout y passe.'),
      h('ul', { class: 'rv-rules' },
        h('li', {}, h('b', {}, '60 s'), 'pour marquer un maximum de points.'),
        h('li', {}, h('b', {}, '×5'), 'au bout d’une longue série. Plus tu enchaînes, plus c’est serré.'),
        h('li', {}, h('b', {}, '−5 s'), 'à chaque erreur. Répondre au hasard ne paie pas.')),
      h('div', { class: 'rv-rival' }, h('span', {}, ghost.name === 'Le Rival' ? 'Rival à battre' : 'Ton fantôme à battre'), h('b', {}, fmt(ghost.score))),
      h('div', { class: 'rv-start' }, h('button', { class: 'btn', type: 'button', onclick: countdown }, 'Lancer le duel'))));
  }

  function countdown() {
    const layer = h('div', { class: 'rv-count', 'aria-live': 'assertive' });
    document.body.append(layer);
    let n = 3;
    const step = () => {
      if (!alive) { layer.remove(); return; }
      if (n === 0) { layer.remove(); sfx.go(); play(); return; }
      layer.innerHTML = ''; layer.append(h('span', {}, n)); sfx.tick(); n--;
      later(step, reducedMotion() ? 250 : 700);
    };
    step();
  }

  function play() {
    let active = 0, lastTick = performance.now(), paused = false, over = false;
    let score = 0, streak = 0, bestStreak = 0, right = 0, total = 0;
    let qStart = 0, current = null, recent = [];
    const tl = [[0, 0]];
    const mistakes = [];

    const meEl = h('span', { class: 'me' }, '0');
    const ghEl = h('span', { class: 'ghost' }, '0');
    const barEl = h('i');
    const clockEl = h('div', { class: 'clock' }, '60');
    const comboEl = h('div', { class: 'rv-combo' }, '');
    const catEl = h('div', { class: 'cat' });
    const askEl = h('p', { class: 'ask' });
    const cardsEl = h('div', { class: 'rv-cards' });

    body.innerHTML = '';
    body.append(
      h('div', { class: 'rv-tug' },
        h('div', { class: 'names' }, h('span', {}, 'Toi'), h('span', {}, ghost.name)),
        h('div', { class: 'scores' }, meEl, ghEl),
        h('div', { class: 'rv-bar' }, barEl)),
      h('div', { class: 'rv-time' }, clockEl, comboEl),
      h('div', { class: 'rv-q' }, catEl, askEl),
      cardsEl);

    let lastKeys = [];
    function pickQuestion() {
      let key = 'box';
      for (let tries = 0; tries < 10; tries++) {
        const tw = TIER_WEIGHT(streak);
        const wOf = c => c.w * tw[c.tier];
        const total = Object.values(CATS).reduce((a, c) => a + wOf(c), 0);
        let r = Math.random() * total, acc = 0;
        for (const [k, c] of Object.entries(CATS)) { acc += wOf(c); if (r <= acc) { key = k; break; } }
        if (!lastKeys.includes(key)) break;
      }
      lastKeys = [...lastKeys, key].slice(-2);
      const cat = CATS[key];
      const up = Math.random() < (key === 'comic' || key === 'mcu' ? 0.4 : key === 'year' || key === 'chrono' || key === 'stones' ? 0.65 : 0.6);
      for (let tries = 0; tries < 80; tries++) {
        const a = cat.items[Math.floor(Math.random() * cat.items.length)];
        if (recent.includes(a.name) && tries < 60) continue;
        const pool = cat.items.filter(b => b !== a && b.name !== a.name && cat.far(a, b, streak) && (!recent.includes(b.name) || tries > 40));
        if (!pool.length) continue;
        const b = pool[Math.floor(Math.random() * pool.length)];
        const pair = Math.random() < 0.5 ? [a, b] : [b, a];
        const win = up ? (pair[0].v > pair[1].v ? 0 : 1) : (pair[0].v < pair[1].v ? 0 : 1);
        recent = [...recent, a.name, b.name].slice(-8);
        return { key, cat, up, pair, win };
      }
      return pickQuestion();
    }

    function card(item, idx) {
      const fam = FAMILIES[item.fam] || FAMILIES.avengers;
      const btn = h('button', {
        class: 'rv-pick enter', type: 'button',
        style: `background: linear-gradient(135deg, ${fam.a}, ${fam.b})`,
        onclick: () => answer(idx),
      },
        h('span', { class: 'emblem', 'aria-hidden': 'true', html: `<svg viewBox="0 0 100 100" width="100%" height="100%">${EMBLEMS[fam.emblem]}</svg>` }),
        h('span', { class: 'kind' }, item.kind),
        h('span', { class: 'name' }, item.name),
        h('span', { class: 'sub' }, item.sub),
        h('span', { class: 'val' }, item.show, item.small ? h('small', {}, item.small) : null));
      return btn;
    }

    function ask() {
      current = pickQuestion();
      catEl.textContent = current.cat.label;
      askEl.innerHTML = current.cat.ask(current.up);
      cardsEl.innerHTML = '';
      current.cards = current.pair.map(card);
      cardsEl.append(...current.cards);
      qStart = active;
      paused = false;
    }

    function floatText(text, el, neg) {
      const r = el.getBoundingClientRect();
      const f = h('div', { class: 'rv-float' + (neg ? ' neg' : ''), style: `left:${r.left + 20}px; top:${r.top + 12}px` }, text);
      document.body.append(f);
      later(() => f.remove(), 950);
    }

    function answer(idx) {
      if (paused || over || !current) return;
      paused = true;
      total++;
      const ms = active - qStart;
      const ok = idx === current.win;
      current.cards.forEach((c, k) => { c.classList.remove('enter'); c.classList.add('reveal'); if (k === current.win) c.classList.add('good'); else c.classList.add('bad'); });
      if (ok) {
        const pts = points(streak, ms);
        streak++; right++; bestStreak = Math.max(bestStreak, streak);
        score += pts;
        sfx.right(streak); buzz(10);
        floatText('+' + pts, current.cards[idx], false);
      } else {
        streak = 0;
        active += PENALTY;
        sfx.wrong(); buzz(60);
        floatText('−5 s', current.cards[idx], true);
        const w = current.pair[current.win], l = current.pair[1 - current.win];
        mistakes.push(`${current.cat.short(current.up)} : <b>${w.name}</b> (${w.show}), pas ${l.name} (${l.show})`);
      }
      tl.push([Math.min(active, DURATION), score]);
      paint();
      later(() => { if (!over) ask(); }, ok ? 650 : 1250);
    }

    function paint() {
      const g = ghostAt(ghost, active);
      meEl.textContent = fmt(score);
      ghEl.textContent = fmt(g);
      const span = Math.max(800, ghost.score * 0.35);
      const p = Math.max(0.04, Math.min(0.96, 0.5 + (score - g) / span / 2));
      barEl.style.width = (p * 100).toFixed(1) + '%';
      const mult = Math.min(5, 1 + Math.floor(streak / 3));
      comboEl.textContent = mult > 1 ? `Série ${streak}  ×${mult}` : streak >= 2 ? `Série ${streak}` : '';
      comboEl.classList.toggle('on', streak >= 2);
    }

    let lastSecond = 60;
    function loop(now) {
      if (!alive || over) return;
      const dt = now - lastTick; lastTick = now;
      if (!paused) active += dt;
      const left = Math.max(0, DURATION - active);
      const sec = Math.ceil(left / 1000);
      clockEl.textContent = sec;
      clockEl.classList.toggle('low', sec <= 10);
      if (sec !== lastSecond && sec <= 5 && sec > 0) sfx.tick();
      lastSecond = sec;
      paint();
      if (left <= 0) { finish(); return; }
      raf = requestAnimationFrame(loop);
    }

    function finish() {
      over = true;
      tl.push([DURATION, score]);
      const g = ghost.score;
      const won = score > g;
      const prevBest = save.best || 0;
      save.best = Math.max(prevBest, score);
      save.played = (save.played || 0) + 1;
      if (won) save.ghost = { name: 'Ton record', score, tl };
      set('rivaux', save);
      if (won) sfx.win(); else sfx.wrong();
      const diff = Math.abs(score - g);
      let close;
      close = sheet([
        h('h2', {}, won ? 'Victoire.' : score === g ? 'Égalité.' : `Battu de ${fmt(diff)}.`),
        h('p', {}, won
          ? (ghost.name === 'Le Rival' ? 'Le Rival est battu. Ton score devient le fantôme à battre.' : 'Tu bats ton propre fantôme. Il n’en revient pas.')
          : 'Le fantôme garde sa place. Pour l’instant.'),
        h('div', { class: 'stat-row' },
          h('div', { class: 'stat' }, h('b', {}, fmt(score)), h('span', {}, 'points')),
          h('div', { class: 'stat' }, h('b', {}, `${right}/${total}`), h('span', {}, 'bonnes réponses')),
          h('div', { class: 'stat' }, h('b', {}, bestStreak), h('span', {}, 'meilleure série'))),
        mistakes.length ? h('ul', { class: 'rv-errors' }, mistakes.slice(-5).map(m => h('li', { html: m }))) : null,
        h('div', { class: 'actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => { close(); location.hash = '#/rivaux?' + Date.now(); } }, 'Rejouer'),
          nextMissionButton('rivaux'),
          h('a', { class: 'btn ghost', href: '#/missions' }, 'Retour aux missions')),
      ], 'rv-sheet');
    }

    keyHandler = e => {
      if (e.key === 'ArrowUp' || e.key === '1') { answer(0); e.preventDefault(); }
      if (e.key === 'ArrowDown' || e.key === '2') { answer(1); e.preventDefault(); }
    };
    window.addEventListener('keydown', keyHandler);
    ask();
    lastTick = performance.now();
    raf = requestAnimationFrame(loop);
  }

  intro();
  return {
    unmount() {
      alive = false;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      if (keyHandler) window.removeEventListener('keydown', keyHandler);
      document.querySelectorAll('.rv-count, .rv-float').forEach(n => n.remove());
    },
  };
}
export { CATS };
