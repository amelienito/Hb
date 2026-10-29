// Sons synthétisés à la volée (aucun fichier audio à charger).
import { get, set } from './store.js';

let ctx = null;
let master = null;
let muted = get('muted', false);

function ac() {
  if (muted) return null;
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ f = 440, to = null, type = 'sine', d = 0.12, v = 0.05, delay = 0, attack = 0.005 }) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + d + 0.05);
}

function noise({ d = 0.08, v = 0.04, f = 2000, delay = 0 }) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * d);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource();
  s.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.2;
  const g = c.createGain(); g.gain.value = v;
  s.connect(bp); bp.connect(g); g.connect(master);
  s.start(t);
}

export const sfx = {
  tap() { noise({ d: 0.04, v: 0.05, f: 3200 }); },
  rotate() { noise({ d: 0.06, v: 0.06, f: 1800 }); tone({ f: 660, to: 880, d: 0.07, v: 0.025, type: 'triangle' }); },
  place() { tone({ f: 220, to: 330, d: 0.09, v: 0.06, type: 'triangle' }); noise({ d: 0.05, v: 0.05, f: 900 }); },
  lit(n = 0) { tone({ f: 523 * Math.pow(1.122, n), d: 0.22, v: 0.03, type: 'sine' }); },
  alarm() { tone({ f: 180, d: 0.18, v: 0.05, type: 'sawtooth' }); tone({ f: 150, d: 0.18, v: 0.04, type: 'sawtooth', delay: 0.16 }); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone({ f, d: 0.5, v: 0.035, type: 'sine', delay: i * 0.07 })); tone({ f: 131, d: 0.8, v: 0.05, type: 'triangle' }); },
  right(n = 0) { tone({ f: 587 * Math.pow(1.06, Math.min(n, 10)), d: 0.14, v: 0.05, type: 'triangle' }); tone({ f: 880 * Math.pow(1.06, Math.min(n, 10)), d: 0.18, v: 0.025, delay: 0.05 }); },
  wrong() { tone({ f: 196, to: 110, d: 0.25, v: 0.06, type: 'sawtooth' }); },
  tick() { tone({ f: 1200, d: 0.03, v: 0.02, type: 'square' }); },
  go() { tone({ f: 392, d: 0.12, v: 0.05, type: 'triangle' }); tone({ f: 784, d: 0.3, v: 0.04, type: 'triangle', delay: 0.1 }); },
  // petit aboiement : p fait varier la hauteur, loud pour les WOOF en capitales
  woof(p = 1, loud = false) {
    const v = loud ? 1.8 : 1;
    tone({ f: 340 * p, to: 185 * p, d: 0.11, v: 0.04 * v, type: 'triangle', attack: 0.008 });
    tone({ f: 680 * p, to: 320 * p, d: 0.06, v: 0.01 * v, type: 'sawtooth' });
    noise({ d: 0.05, v: 0.022 * v, f: 750 * p });
  },
  ears() { tone({ f: 880, to: 1320, d: 0.08, v: 0.03, type: 'sine' }); tone({ f: 990, to: 1480, d: 0.08, v: 0.025, type: 'sine', delay: 0.09 }); },
};

export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m;
  set('muted', m);
  if (m && ctx) ctx.suspend();
}
// Les navigateurs mobiles n'autorisent le son qu'après un premier geste.
export function unlock() { if (!muted) ac(); }
