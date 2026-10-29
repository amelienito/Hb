// L'interview : un entretien façon magazine. Amélien pose les questions, Talya répond.
// Une question à la fois ; la réponse s'écrit woof par woof, avec un petit aboiement.
import { h, backButton, soundButton, buzz, reducedMotion } from '../../core/ui.js';
import { gameBar } from '../../core/nav.js';
import { get, set } from '../../core/store.js';
import { sfx } from '../../core/sound.js';
import { bustSVG } from '../../core/talya.js';
import { KICKER, TITLE, INTRO, CAPTION, QA, CLOSING, EPILOGUE, SIGNATURE, CREDITS, OSB } from './data.js';

export const SAVE_KEY = 'interview';
export const COUNT = QA.length;

// Typographie française : espace fine insécable avant ? ! : ; » et après «.
export function typo(s) {
  return s.replace(/ ([?!:;»])/g, ' $1').replace(/« /g, '« ');
}

// _texte_ → italique ; [texte](lien) → lien (ouvert dans un nouvel onglet)
function italics(s) {
  const out = [];
  s.split(/_(.+?)_/).forEach((part, k) => { if (part) out.push(k % 2 ? h('em', {}, part) : part); });
  return out;
}
function rich(s) {
  const out = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    out.push(...italics(s.slice(last, m.index)));
    out.push(h('a', { href: m[2], target: '_blank', rel: 'noopener' }, ...italics(m[1])));
    last = re.lastIndex;
  }
  out.push(...italics(s.slice(last)));
  return out;
}

// Chaque mot devient « woof », en gardant la casse et la ponctuation de la phrase d'origine.
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
function woofCase(part) {
  const letters = part.replace(/[^\p{L}]/gu, '');
  if (letters.length > 1 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) return 'WOOF';
  return /^\p{Lu}/u.test(part) ? 'Woof' : 'woof';
}
export function woofify(s) {
  return s.replace(WORD, m => m.split('-').map(woofCase).join('-'));
}

export function mount(root) {
  root.classList.add('g-screen', 'interview');
  const save = get(SAVE_KEY, {});
  let shown = -1;        // dernière question affichée
  let typing = null;     // réponse en train de s'écrire
  let closed = false;     // mot de la fin d'Amélien affiché
  let ended = false;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };

  const qa = h('div', { class: 'iv-qa' });
  const endBox = h('div', { class: 'iv-end', hidden: true });
  const countEl = h('span', { class: 'iv-count' });
  const nextBtn = h('button', { class: 'btn iv-next', type: 'button', onclick: next });
  const allBtn = h('button', { class: 'iv-all', type: 'button', onclick: showAll }, 'Tout afficher');
  const dock = h('div', { class: 'iv-dock' }, h('div', { class: 'iv-dock-in' }, countEl, nextBtn, allBtn));

  root.append(
    gameBar('interview', 'L’interview', soundButton()),
    h('article', { class: 'iv-paper' },
      h('p', { class: 'iv-kicker' }, KICKER),
      h('h1', { class: 'iv-title' }, typo(TITLE)),
      h('p', { class: 'iv-standfirst' }, typo(INTRO)),
      h('figure', { class: 'iv-photo' },
        h('div', { class: 'iv-photo-img', html: bustSVG() }),
        h('figcaption', {}, CAPTION)),
      h('p', { class: 'iv-byline' }, 'Propos recueillis par ', h('b', {}, 'Amélien')),
      qa,
      endBox),
    dock,
  );

  // Fait défiler juste ce qu'il faut pour voir l'élément au-dessus du bandeau du bas.
  function bringIntoView(el, smooth = true) {
    const r = el.getBoundingClientRect();
    const room = window.innerHeight - (dock.hidden ? 0 : dock.offsetHeight) - 8;
    let dy = 0;
    if (r.bottom > room) dy = Math.min(r.bottom - room, r.top - 64);
    else if (r.top < 0) dy = r.top - 64;
    if (Math.abs(dy) > 2) window.scrollBy({ top: dy, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
  }

  function paintDock() {
    const last = shown >= QA.length - 1;
    countEl.textContent = shown < 0 ? `${QA.length} questions` : closed ? 'Fin de l’entretien' : `Question ${shown + 1} sur ${QA.length}`;
    nextBtn.textContent = typing ? 'Passer'
      : shown < 0 ? (save.read ? 'Relire l’interview' : 'Commencer l’interview')
      : !last ? 'Question suivante'
      : !closed ? 'Le mot de la fin'
      : 'Fin de l’entretien';
    allBtn.hidden = ended;
    dock.hidden = ended;
  }

  // La réponse est posée en entier mais invisible, puis chaque woof apparaît : pas de saut de mise en page.
  function typeOut(box, text, done) {
    const parts = text.split(' ');
    const spans = parts.map((w, k) => h('span', { class: 'w' }, (k ? ' ' : '') + w));
    const p = box.querySelector('p');
    p.replaceChildren(...spans);
    box.classList.add('wait');
    let k = 0, timer = 0, over = false;
    const finish = () => {
      if (over) return;
      over = true; clearTimeout(timer); timers.delete(timer);
      spans.forEach(s => s.classList.add('on'));
      box.classList.remove('wait');
      done();
    };
    const step = () => {
      box.classList.remove('wait');
      const w = parts[k];
      spans[k].classList.add('on');
      const loud = w.includes('WOOF');
      sfx.woof(0.9 + Math.random() * 0.25, loud);
      if (loud) buzz(14);
      k++;
      if (k >= parts.length) { finish(); return; }
      const end = w.slice(-1);
      const pause = /[.!?]/.test(end) ? 430 : end === '…' ? 560 : /[,:;]/.test(end) ? 220 : 120;
      timer = later(step, pause + Math.random() * 50);
    };
    timer = later(step, 800);
    box.addEventListener('click', finish, { once: true });
    return { finish };
  }

  function addExchange(n, live) {
    const item = QA[n];
    const woofs = typo(woofify(item.a));
    const aBox = h('div', { class: 'iv-a', 'aria-label': 'Talya : ' + woofs }, h('span', { class: 'iv-who' }, 'Talya'), h('p', {}, live ? '' : woofs));
    const ex = h('section', { class: 'iv-ex' + (live ? ' in' : '') },
      h('span', { class: 'iv-num', 'aria-hidden': 'true' }, String(n + 1).padStart(2, '0')),
      h('div', { class: 'iv-q' }, h('span', { class: 'iv-who' }, 'Amélien'), h('p', {}, rich(typo(item.q)))),
      aBox);
    qa.append(ex);
    const pull = () => {
      if (!item.pull) return;
      qa.append(h('blockquote', { class: 'iv-pull' + (live ? ' in' : '') },
        h('p', {}, typo('« ' + woofify(item.pull) + ' »')),
        h('cite', {}, 'Talya, pour Florian')));
    };
    if (!live || reducedMotion()) { if (live) aBox.querySelector('p').textContent = woofs; pull(); return; }
    bringIntoView(ex);
    typing = typeOut(aBox, woofs, () => {
      typing = null; pull(); paintDock();
      const tail = qa.lastElementChild;
      if (tail !== ex) later(() => bringIntoView(tail), 60);
    });
  }

  // Le mot de la fin : Amélien a la dernière réplique.
  function showClosing(live) {
    closed = true;
    const ex = h('section', { class: 'iv-ex iv-closing' + (live ? ' in' : '') },
      h('div', { class: 'iv-q' }, h('span', { class: 'iv-who' }, 'Amélien'), h('p', {}, rich(typo(CLOSING)))));
    qa.append(ex);
    if (live) later(() => bringIntoView(ex), 30);
    paintDock();
  }

  function showEnd(live) {
    ended = true;
    root.classList.add('iv-done');
    save.read = true; set(SAVE_KEY, save);
    endBox.hidden = false;
    endBox.replaceChildren(
      h('p', { class: 'iv-epilogue' }, typo(EPILOGUE)),
      h('p', { class: 'iv-sign' }, SIGNATURE, h('span', { class: 'iv-endmark', 'aria-hidden': 'true' })),
      h('div', { class: 'iv-credits' },
        CREDITS.map(c => h('p', {}, c)),
        h('p', {}, h('a', { href: OSB.href, target: '_blank', rel: 'noopener' }, OSB.label))),
      h('div', { class: 'iv-actions' },
        h('a', { class: 'btn', href: '#/missions' }, 'Retour aux missions'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => { location.hash = '#/interview?' + Date.now(); } }, 'Relire depuis le début')),
    );
    if (live) { endBox.classList.add('in'); later(() => bringIntoView(endBox), 30); }
    paintDock();
  }

  function next() {
    if (typing) { typing.finish(); return; }
    if (ended) return;
    sfx.tap();
    if (shown < QA.length - 1) { shown++; addExchange(shown, true); }
    else if (!closed) showClosing(true);
    else showEnd(true);
    paintDock();
  }

  function showAll() {
    if (typing) typing.finish();
    while (shown < QA.length - 1) { shown++; addExchange(shown, false); }
    if (!closed) showClosing(false);
    if (!ended) showEnd(false);
  }

  paintDock();
  return {
    unmount() { timers.forEach(clearTimeout); timers.clear(); },
  };
}
