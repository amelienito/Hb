// Rivaux Marvel : 60 secondes de duels « lequel des deux ? » contre un fantôme.
// La difficulté monte avec la série : plus tu enchaînes, plus les écarts se resserrent.
import { h, backButton, soundButton, sheet, fmt, buzz, reducedMotion } from '../../core/ui.js';
import { get, set } from '../../core/store.js';
import { sfx } from '../../core/sound.js';
import { FILMS, HEROES, FAMILIES } from './data.js';

const DURATION = 60000;
const PENALTY = 5000;

const money = m => (m >= 1000 ? (m / 1000).toFixed(2).replace('.', ',') + ' Md$' : m + ' M$');

const CATS = {
  box: {
    w: 0.4, label: 'Box-office mondial',
    items: FILMS.map(f => ({ name: f[0], kind: 'Film, ' + f[1], fam: f[2], v: f[3], show: money(f[3]), sub: 'Au box-office ?' })),
    ask: up => (up ? 'Lequel a rapporté <em>le plus</em> ?' : 'Lequel a rapporté <em>le moins</em> ?'),
    short: up => (up ? 'Plus gros box-office' : 'Plus petit box-office'),
    far: (a, b, s) => Math.max(a.v, b.v) / Math.min(a.v, b.v) >= Math.max(1.12, 1.9 - s * 0.08),
  },
  dur: {
    w: 0.25, label: 'Durée en salle',
    items: FILMS.map(f => ({ name: f[0], kind: 'Film, ' + f[1], fam: f[2], v: f[4], show: f[4] + ' min', sub: 'Combien de temps ?' })),
    ask: up => (up ? 'Lequel est <em>le plus long</em> ?' : 'Lequel est <em>le plus court</em> ?'),
    short: up => (up ? 'Plus long' : 'Plus court'),
    far: (a, b, s) => Math.abs(a.v - b.v) >= Math.max(6, 28 - s * 2.5),
  },
  comic: {
    w: 0.35, label: 'Première apparition en comics',
    // pour « en premier », la plus petite année gagne : on inverse le signe
    items: HEROES.map(c => ({ name: c[0], kind: 'Personnage', fam: c[3], v: c[1], show: String(c[1]), small: c[2], sub: 'Première apparition ?' })),
    ask: up => (up ? 'Qui est apparu <em>le plus tard</em> ?' : 'Qui est apparu <em>en premier</em> ?'),
    short: up => (up ? 'Apparu plus tard' : 'Apparu en premier'),
    far: (a, b, s) => Math.abs(a.v - b.v) >= Math.max(1, 14 - s * 1.2),
  },
};

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
      h('p', { class: 'lead' }, 'Deux noms, une question, une seconde pour trancher. Box-office, durées, premières apparitions en comics.'),
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

    function pickQuestion() {
      const r = Math.random();
      let acc = 0, key = 'box';
      for (const [k, c] of Object.entries(CATS)) { acc += c.w; if (r <= acc) { key = k; break; } }
      const cat = CATS[key];
      const up = Math.random() < (key === 'comic' ? 0.4 : 0.6);
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
          h('a', { class: 'btn ghost', href: '#/' }, 'Retour aux missions')),
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
