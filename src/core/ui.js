// Petits utilitaires d'interface partagés par tous les écrans.
import { isMuted, setMuted, sfx } from './sound.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function fmt(n) { return Math.round(n).toLocaleString('fr-FR'); }

export function buzz(ms = 12) { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* rien */ } }

export const ICONS = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  nose: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 14c2-1 3-1 5 0M4 10c3-1 5-1 7 0M14 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0"/></svg>',
  sock: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M9 3h6v9l3 3a3 3 0 0 1-4 4l-5-5V3z"/><path d="M9 7h6"/></svg>',
};

export function soundButton() {
  const b = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Son' });
  const paint = () => {
    b.innerHTML = isMuted() ? ICONS.soundOff : ICONS.soundOn;
    b.setAttribute('aria-label', isMuted() ? 'Activer le son' : 'Couper le son');
  };
  b.addEventListener('click', () => { setMuted(!isMuted()); paint(); if (!isMuted()) sfx.tap(); });
  paint();
  return b;
}

export function backButton(href = '#/') {
  return h('a', { class: 'icon-btn', href, 'aria-label': 'Retour aux missions', html: ICONS.back });
}

// Feuille modale du bas. Renvoie une fonction pour la fermer.
export function sheet(content, cls = '') {
  const box = h('div', { class: 'sheet ' + cls, role: 'dialog', 'aria-modal': 'true' }, content);
  const ov = h('div', { class: 'overlay' }, box);
  document.body.append(ov);
  // au clavier, on place le focus dans la feuille ; au doigt, on évite le contour parasite
  if (window.matchMedia('(hover: hover)').matches) {
    const first = box.querySelector('button, a');
    if (first) setTimeout(() => first.focus({ preventScroll: true, focusVisible: false }), 50);
  }
  return () => ov.remove();
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
