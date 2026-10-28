// Sauvegarde locale (progression, records). Ne plante jamais si le stockage est bloqué.
const KEY = 'rp-talya-v1';
let data = {};
try { data = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { data = {}; }

export function get(key, fallback) {
  return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : fallback;
}

export function set(key, value) {
  data[key] = value;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* navigation privée */ }
}
