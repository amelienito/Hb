// « Tu préfères ? » : au choix, des dilemmes Marvel ou des hot takes, puis un profil de fan.
import { h, soundButton, buzz, reducedMotion } from '../../core/ui.js';
import { gameBar, nextMissionButton } from '../../core/nav.js';
import { get, set } from '../../core/store.js';
import { sfx } from '../../core/sound.js';
import { DILEMMAS, TAKES, AXES, TRAITS, MATCHES, PER_GAME } from './data.js';

export const SAVE_KEY = 'prefs';
export const COUNTS = { dilemmas: DILEMMAS.length, takes: TAKES.length };

// Les deux effets possibles d'une question : [si a / oui, si b / non]
const effects = q => q.kind === 'd' ? [DILEMMAS[q.i].a[1], DILEMMAS[q.i].b[1]] : [TAKES[q.i][1], TAKES[q.i][3]];

// answers : [{ kind: 'd' | 't', i, val }] — seules les questions jouées comptent.
export function profileOf(answers) {
  const score = { S: 0, C: 0, M: 0, V: 0, F: 0 }, max = { S: 0, C: 0, M: 0, V: 0, F: 0 };
  for (const q of answers) {
    const [x, y] = effects(q);
    const eff = (q.val === 'a' || q.val === 'oui') ? x : y;
    // chaque réponse compte par rapport à la moyenne des deux options : un choix « neutre » ne pousse nulle part
    for (const k in score) {
      score[k] += (eff[k] || 0) - ((x[k] || 0) + (y[k] || 0)) / 2;
      max[k] += Math.max(Math.abs(x[k] || 0), Math.abs(y[k] || 0));
    }
  }
  const norm = {};
  for (const k in score) norm[k] = max[k] ? Math.max(-1, Math.min(1, score[k] / (max[k] * 0.35))) : 0;
  const ranked = Object.entries(norm).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const trait = ([k, v]) => TRAITS[k + (v >= 0 ? '+' : '-')];
  const title = `${trait(ranked[0])} et ${trait(ranked[1])}`;
  // l'Avenger le plus proche par la direction du profil (similarité cosinus)
  let best = MATCHES[0], bestS = -Infinity;
  const nn = Math.hypot(...Object.values(norm)) || 1;
  for (const m of MATCHES) {
    let dot = 0, mm = 0;
    for (const k in norm) { dot += norm[k] * (m.v[k] || 0); mm += (m.v[k] || 0) ** 2; }
    const sim = dot / (nn * Math.sqrt(mm));
    if (sim > bestS) { bestS = sim; best = m; }
  }
  return { norm, title, match: best };
}

// Tirage au hasard, en évitant si possible les questions de la partie précédente.
function draw(kind, n, avoid = []) {
  const total = kind === 'd' ? DILEMMAS.length : TAKES.length;
  const idx = [...Array(total).keys()];
  for (let k = idx.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [idx[k], idx[j]] = [idx[j], idx[k]]; }
  const fresh = idx.filter(i => !avoid.includes(i)), old = idx.filter(i => avoid.includes(i));
  return [...fresh, ...old].slice(0, n).map(i => ({ kind, i }));
}

export function mount(root) {
  root.classList.add('g-screen', 'prefs');
  root.append(gameBar('prefs', 'Tu préfères ?', soundButton()));
  const body = h('div', { class: 'pf-body' });
  root.append(body);
  let mode = 'd', list = [], answers = [], i = 0, locked = false, timer = 0;

  function start(m) {
    mode = m;
    const prev = (get(SAVE_KEY, {}).seen || {})[m] || [];
    list = draw(m, PER_GAME, prev);
    answers = []; i = 0;
    ask();
  }

  function intro() {
    const last = get(SAVE_KEY, null);
    body.innerHTML = '';
    const modeBtn = (m, title, line) => h('button', { class: 'pf-mode pf-mode-' + m, type: 'button', onclick: () => start(m) },
      h('b', {}, title), h('span', {}, line));
    body.append(h('div', { class: 'pf-intro' },
      h('h1', {}, 'Tu', h('br'), 'préfères\u00A0?'),
      h('p', { class: 'lead' }, 'Pas de bonne réponse, seulement des réponses défendables. Choisis ton terrain :'),
      h('div', { class: 'pf-modes' },
        modeBtn('d', 'Tu préfères…', `${PER_GAME} dilemmes Marvel, deux choix à chaque fois.`),
        modeBtn('t', 'Hot takes', `${PER_GAME} avis tranchés : d’accord ou pas d’accord\u202F?`)),
      h('p', { class: 'pf-note' }, 'À la fin, ton profil de fan. À capturer et à envoyer à Amélien, qui aura forcément un avis. Les questions changent à chaque partie.'),
      last && last.title ? h('p', { class: 'pf-last' }, 'Dernier profil : ', h('b', {}, last.title)) : null));
  }

  function ask() {
    locked = false;
    clearTimeout(timer);
    body.innerHTML = '';
    const q = list[i], isTake = q.kind === 't';
    const head = h('div', { class: 'pf-head' },
      h('span', {}, isTake ? 'Hot take' : 'Tu préfères…'),
      h('span', { class: 'pf-count' }, `${i + 1} / ${list.length}`));
    const bar = h('div', { class: 'pf-bar' }, h('i', { style: `width:${(i / list.length) * 100}%` }));
    const react = h('p', { class: 'pf-react', 'aria-live': 'polite' });
    let a, b;
    if (!isTake) {
      const d = DILEMMAS[q.i];
      a = choice('a', d.a[0], 'pf-a');
      b = choice('b', d.b[0], 'pf-b');
      body.append(head, bar, h('div', { class: 'pf-choices' }, a, h('div', { class: 'pf-or' }, 'ou'), b), react);
    } else {
      const t = TAKES[q.i];
      a = choice('oui', 'D’accord', 'pf-yes');
      b = choice('non', 'Pas d’accord', 'pf-no');
      body.append(head, bar, h('blockquote', { class: 'pf-take' }, t[0]), h('div', { class: 'pf-votes' }, a, b), react);
    }

    function choice(val, label, cls) {
      return h('button', { class: 'pf-choice ' + cls, type: 'button', onclick: () => pick(val) }, h('span', {}, label));
    }
    function pick(val) {
      if (locked) return;
      locked = true;
      answers[i] = { ...q, val };
      sfx.right(i % 6); buzz(10);
      const mine = (val === 'a' || val === 'oui') ? a : b, other = mine === a ? b : a;
      mine.classList.add('picked'); other.classList.add('dropped');
      react.textContent = isTake ? (val === 'oui' ? TAKES[q.i][2] : TAKES[q.i][4]) : DILEMMAS[q.i][val][2];
      react.classList.add('on');
      const next = h('button', { class: 'btn ghost pf-next', type: 'button', onclick: go }, i + 1 < list.length ? 'Suivant' : 'Voir mon profil');
      body.append(next);
      timer = setTimeout(go, reducedMotion() ? 3500 : 3200);
    }
    function go() { clearTimeout(timer); i++; if (i < list.length) ask(); else result(); }
  }

  function result() {
    const p = profileOf(answers);
    const prev = get(SAVE_KEY, {}) || {};
    const seen = { ...(prev.seen || {}), [mode]: list.map(q => q.i) };
    set(SAVE_KEY, { title: p.title, match: p.match.name, mode, seen });
    sfx.win();
    body.innerHTML = '';
    const other = mode === 'd' ? 't' : 'd';
    body.append(h('div', { class: 'pf-result' },
      h('p', { class: 'pf-kicker' }, 'Profil de fan de Florian, 30 ans'),
      h('h2', {}, cap(p.title) + '.'),
      h('div', { class: 'pf-match' },
        h('span', {}, 'Ton Avenger intérieur'),
        h('b', {}, p.match.name),
        h('p', {}, p.match.line)),
      h('div', { class: 'pf-axes' }, AXES.map(ax => {
        const v = p.norm[ax.k];
        return h('div', { class: 'pf-axis' },
          h('div', { class: 'pf-axis-l' }, h('span', { class: v < 0 ? 'on' : '' }, ax.minus), h('span', { class: v > 0 ? 'on' : '' }, ax.plus)),
          h('div', { class: 'pf-track' }, h('i', { style: `left:${(50 + v * 46).toFixed(1)}%` })));
      })),
      h('p', { class: 'pf-agree' }, 'Fais une capture d’écran et envoie-la à Amélien. Il a sûrement des objections.'),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => start(other) }, other === 't' ? 'Passer aux hot takes' : 'Passer aux dilemmes'),
        nextMissionButton('prefs'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => start(mode) }, 'Rejouer avec d’autres questions'),
        h('a', { class: 'btn ghost', href: '#/missions' }, 'Retour aux missions'))));
  }

  intro();
  return { unmount() { clearTimeout(timer); } };
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
