// Talya : chienne au pelage blanc, grandes oreilles triangulaires dressées, regard sombre.
// Toujours dessinée de profil.

// Buste en facettes pour l'écran d'accueil (regard vers la droite).
export function bustSVG() {
  return `
<svg viewBox="0 0 320 380" role="img" aria-label="Talya, de profil">
  <defs>
    <radialGradient id="moonrim" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#dcebe3" stop-opacity=".2"/>
      <stop offset="1" stop-color="#dcebe3" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bustfade" x1="0" y1="0" x2="0" y2="1">
      <stop offset=".6" stop-color="#fff"/>
      <stop offset=".98" stop-color="#000"/>
    </linearGradient>
    <mask id="bustmask"><rect width="320" height="380" fill="url(#bustfade)"/></mask>
  </defs>
  <circle cx="196" cy="150" r="150" fill="url(#moonrim)"/>
  <g mask="url(#bustmask)">
  <!-- silhouette pleine sous les facettes, pour éviter les jours entre elles -->
  <polygon points="66,380 88,262 104,186 106,160 116,44 150,132 152,136 180,20 200,146 216,164 286,202 296,216 290,232 238,244 212,258 180,284 204,380" fill="#e2e8e4"/>
  <!-- cou -->
  <polygon points="66,380 88,262 104,186 152,214 140,256" fill="#d9e0db"/>
  <polygon points="140,256 180,284 204,380 66,380" fill="#e9ede9"/>
  <!-- oreille arrière -->
  <polygon points="106,160 116,44 150,132" fill="#d3dad5"/>
  <polygon points="116,150 120,74 140,136" fill="#c9b7b3" opacity=".55"/>
  <!-- crâne -->
  <polygon points="104,186 106,160 150,132 158,136 198,142 216,164 204,204 152,214" fill="#f3f5f2"/>
  <!-- oreille avant -->
  <polygon points="152,136 180,20 200,146" fill="#ffffff"/>
  <polygon points="164,132 181,52 192,136" fill="#e8d2cd"/>
  <!-- chanfrein et museau -->
  <polygon points="216,164 286,202 296,216 246,220 204,204" fill="#ffffff"/>
  <polygon points="204,204 246,220 296,216 290,232 238,244 212,258" fill="#e9ede9"/>
  <!-- joue -->
  <polygon points="152,214 204,204 212,258 180,284 140,256" fill="#e1e7e2"/>
  <!-- œil -->
  <path d="M196 176 q10 -9 22 -2 q-9 10 -22 2z" fill="#15100e"/>
  <circle cx="211" cy="174" r="2" fill="#ffffff" opacity=".85"/>
  <!-- truffe -->
  <path d="M286 204 q14 2 12 14 q-2 9 -12 8 q-6 -9 0 -22z" fill="#15100e"/>
  <!-- bouche -->
  <path d="M289 231 q-22 9 -46 11" stroke="#15100e" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".5"/>
  </g>
</svg>`;
}

// Oreille utilisée comme lettre A dans le titre.
export function earSVG(id) {
  return `<svg viewBox="0 0 60 110" aria-hidden="true">
    <polygon points="0,110 30,0 60,110" fill="#f1f3ee"/>
    <polygon points="15,104 30,38 45,104" fill="#e3c9c3"/>
  </svg>`;
}

export function pinesSVG() {
  // Silhouettes de sapins sur deux plans, dessinées une fois.
  const back = [], front = [];
  let x = -20;
  let seed = 7;
  const r = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  while (x < 420) {
    const w = 34 + r() * 30, hgt = 70 + r() * 70;
    back.push(`<polygon points="${x},200 ${x + w / 2},${200 - hgt} ${x + w},200"/>`);
    x += w * 0.6;
  }
  x = -30;
  while (x < 420) {
    const w = 44 + r() * 40, hgt = 50 + r() * 60;
    front.push(`<polygon points="${x},200 ${x + w / 2},${200 - hgt} ${x + w},200"/>`);
    x += w * 0.7;
  }
  return `<svg viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true">
    <g fill="#10201b">${back.join('')}</g>
    <g fill="#0b1613">${front.join('')}</g>
    <rect x="0" y="190" width="400" height="10" fill="#0b1613"/>
  </svg>`;
}

// Talya en entier pour les canvas des jeux. (x, y) = point au sol, sous le poitrail.
// opts : { s: échelle, face: 1 ou -1, run: phase de course, hop: hauteur de saut, ears: 0..1 (1 = dressées), wag: phase de queue }
export function drawTalya(ctx, x, y, opts = {}) {
  const s = opts.s || 1, face = opts.face || 1;
  const run = opts.run || 0, hop = opts.hop || 0;
  const ears = opts.ears == null ? 1 : opts.ears;
  const wag = opts.wag || 0;
  ctx.save();
  // ombre au sol
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 20 * s * (1 - hop / 80), 3.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, y - hop);
  ctx.scale(face * s, s);
  const W = '#f3f5f2', SH = '#d5dcd7', DK = '#15100e';
  const bob = Math.sin(run * 2) * 1.2;
  // pattes
  const leg = (lx, ph) => {
    const a = Math.sin(run + ph) * 0.5;
    ctx.save(); ctx.translate(lx, -12 + bob); ctx.rotate(a);
    ctx.fillStyle = ph > 1 ? SH : W;
    ctx.beginPath(); ctx.roundRect(-2.2, 0, 4.4, 13, 2.2); ctx.fill();
    ctx.restore();
  };
  leg(-11, 2.4); leg(9, 2.4); leg(-8, 0); leg(12, 0);
  // queue en panache
  ctx.save();
  ctx.translate(-17, -19 + bob);
  ctx.rotate(-0.9 + Math.sin(wag) * 0.35);
  ctx.fillStyle = W;
  ctx.beginPath(); ctx.ellipse(0, -7, 3.6, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // corps
  ctx.fillStyle = W;
  ctx.beginPath(); ctx.ellipse(0, -18 + bob, 18, 8.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = SH;
  ctx.beginPath(); ctx.ellipse(-2, -14 + bob, 13, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  // cou + tête
  ctx.fillStyle = W;
  ctx.beginPath();
  ctx.moveTo(10, -24 + bob); ctx.lineTo(16, -36 + bob); ctx.lineTo(24, -30 + bob); ctx.lineTo(19, -16 + bob); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(20, -34 + bob, 7.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  // museau
  ctx.beginPath(); ctx.moveTo(24, -38 + bob); ctx.lineTo(34, -33 + bob); ctx.lineTo(33, -29.5 + bob); ctx.lineTo(23, -29 + bob); ctx.closePath(); ctx.fill();
  // oreilles (plus ou moins dressées)
  const ea = (1 - ears) * 0.9;
  const ear = (bx, tilt, fill) => {
    ctx.save(); ctx.translate(bx, -39 + bob); ctx.rotate(tilt - ea);
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.moveTo(-3.6, 1); ctx.lineTo(0.6, -14); ctx.lineTo(4, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e3c9c3';
    ctx.beginPath(); ctx.moveTo(-1.6, 0); ctx.lineTo(0.6, -9); ctx.lineTo(2.2, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  ear(15.5, -0.18, SH);
  ear(20.5, 0.08, W);
  // œil et truffe. De profil vers la droite on voit son œil droit ; vers la gauche, le côté
  // de l'œil qu'elle n'a plus, donc juste du pelage, comme en vrai.
  ctx.fillStyle = DK;
  if (face > 0) { ctx.beginPath(); ctx.ellipse(24.5, -35 + bob, 1.6, 1.3, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(34, -32 + bob, 1.9, 1.7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
