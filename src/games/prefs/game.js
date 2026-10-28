// « Tu préfères ? » : 12 dilemmes Marvel puis 8 hot takes, et un profil de fan à la fin.
import { h, backButton, soundButton, buzz, reducedMotion } from '../../core/ui.js';
import { get, set } from '../../core/store.js';
import { sfx } from '../../core/sound.js';
import { DILEMMAS, TAKES, AXES, TRAITS, MATCHES, AMELIEN } from './data.js';

export const SAVE_KEY = 'prefs';
const TOTAL = DILEMMAS.length + TAKES.length;

export function profileOf(answers) {
  const score = { S: 0, C: 0, M: 0, V: 0, F: 0 }, max = { S: 0, C: 0, M: 0, V: 0, F: 0 };
  // chaque réponse compte par rapport à la moyenne des deux options : un choix « neutre » ne pousse nulle part
  answers.forEach((ans, i) => {
    const [x, y] = i < DILEMMAS.length ? [DILEMMAS[i].a[1], DILEMMAS[i].b[1]] : [TAKES[i - DILEMMAS.length][1], TAKES[i - DILEMMAS.length][3]];
    const eff = (ans === 'a' || ans === 'oui') ? x : y;
    for (const k in score) score[k] += (eff[k] || 0) - ((x[k] || 0) + (y[k] || 0)) / 2;
  });
  // amplitude possible sur chaque axe, pour ramener entre −1 et 1
  DILEMMAS.forEach(d => { for (const k in max) max[k] += Math.max(Math.abs(d.a[1][k] || 0), Math.abs(d.b[1][k] || 0)); });
  TAKES.forEach(t => { for (const k in max) max[k] += Math.max(Math.abs(t[1][k] || 0), Math.abs(t[3][k] || 0)); });
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

export function mount(root) {
  root.classList.add('g-screen', 'prefs');
  root.append(h('header', { class: 'g-bar' }, backButton(), h('div', { class: 'g-title' }, 'Tu préfères ?'), soundButton()));
  const body = h('div', { class: 'pf-body' });
  root.append(body);
  let answers = [], i = 0, locked = false, timer = 0;

  function intro() {
    const last = get(SAVE_KEY, null);
    body.innerHTML = '';
    body.append(h('div', { class: 'pf-intro' },
      h('h1', {}, 'Tu', h('br'), 'préfères ?'),
      h('p', { class: 'lead' }, `${DILEMMAS.length} dilemmes Marvel, puis ${TAKES.length} hot takes. Pas de bonne réponse, seulement des réponses défendables.`),
      h('p', { class: 'pf-note' }, 'À la fin, ton profil de fan. À capturer et à envoyer à Amélien, qui aura forcément un avis.'),
      last && last.title ? h('p', { class: 'pf-last' }, 'Dernier profil : ', h('b', {}, last.title)) : null,
      h('div', { class: 'pf-start' }, h('button', { class: 'btn', type: 'button', onclick: () => { answers = []; i = 0; ask(); } }, last ? 'Recommencer' : 'Commencer'))));
  }

  function ask() {
    locked = false;
    clearTimeout(timer);
    body.innerHTML = '';
    const isTake = i >= DILEMMAS.length;
    const head = h('div', { class: 'pf-head' },
      h('span', {}, isTake ? 'Hot take' : 'Tu préfères…'),
      h('span', { class: 'pf-count' }, `${i + 1} / ${TOTAL}`));
    const bar = h('div', { class: 'pf-bar' }, h('i', { style: `width:${(i / TOTAL) * 100}%` }));
    const react = h('p', { class: 'pf-react', 'aria-live': 'polite' });
    let a, b;
    if (!isTake) {
      const d = DILEMMAS[i];
      a = choice('a', d.a[0], 'pf-a');
      b = choice('b', d.b[0], 'pf-b');
      body.append(head, bar, h('div', { class: 'pf-choices' }, a, h('div', { class: 'pf-or' }, 'ou'), b), react);
    } else {
      const t = TAKES[i - DILEMMAS.length];
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
      answers[i] = val;
      sfx.right(i % 6); buzz(10);
      const mine = (val === 'a' || val === 'oui') ? a : b, other = mine === a ? b : a;
      mine.classList.add('picked'); other.classList.add('dropped');
      react.textContent = isTake ? (val === 'oui' ? TAKES[i - DILEMMAS.length][2] : TAKES[i - DILEMMAS.length][4]) : DILEMMAS[i][val][2];
      react.classList.add('on');
      const next = h('button', { class: 'btn ghost pf-next', type: 'button', onclick: go }, i + 1 < TOTAL ? 'Suivant' : 'Voir mon profil');
      body.append(next);
      timer = setTimeout(go, reducedMotion() ? 3500 : 3200);
    }
    function go() { clearTimeout(timer); i++; if (i < TOTAL) ask(); else result(); }
  }

  function result() {
    const p = profileOf(answers);
    set(SAVE_KEY, { title: p.title, match: p.match.name, answers });
    sfx.win();
    body.innerHTML = '';
    let agree = null;
    if (AMELIEN && AMELIEN.length === TOTAL) agree = answers.filter((v, k) => v === AMELIEN[k]).length;
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
      agree != null ? h('p', { class: 'pf-agree' }, `D’accord avec Amélien sur ${agree} sur ${TOTAL}.`) : h('p', { class: 'pf-agree' }, 'Fais une capture d’écran et envoie-la à Amélien. Il a sûrement des objections.'),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => { answers = []; i = 0; ask(); } }, 'Rejouer'),
        h('a', { class: 'btn ghost', href: '#/' }, 'Retour aux missions'))));
  }

  intro();
  return { unmount() { clearTimeout(timer); } };
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
