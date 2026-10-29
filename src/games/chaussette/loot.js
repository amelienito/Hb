// Le butin d'Opération Osmose : un dessin par objet (CD de la mixtape Seta, magazine Osmose, sticker Osmose),
// utilisé tel quel dans le jeu, dans le compteur du haut et dans le pop-up de ramassage.
const INK = '#15110f';

export const LOOT_SVG = {
  // disque argenté, reflets arc-en-ciel, étiquette rouge Seta, trou au centre
  cd: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="96" height="96" aria-hidden="true">
<circle cx="16" cy="16" r="14.6" fill="#e9edf1" stroke="${INK}" stroke-width="1.8"/>
<path d="M16 16 L16 1.4 A14.6 14.6 0 0 1 28.64 8.7 Z" fill="#78d4ff" opacity=".8"/>
<path d="M16 16 L28.64 23.3 A14.6 14.6 0 0 1 16 30.6 Z" fill="#ffe27a" opacity=".8"/>
<path d="M16 16 L3.36 23.3 A14.6 14.6 0 0 1 1.4 16 Z" fill="#ff9bd5" opacity=".8"/>
<circle cx="16" cy="16" r="9.4" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".8"/>
<circle cx="16" cy="16" r="6.4" fill="#d23c2c" stroke="${INK}" stroke-width="1.3"/>
<path d="M11.4 16a4.6 4.6 0 0 1 4.6-4.6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1" stroke-linecap="round"/>
<circle cx="16" cy="16" r="2.5" fill="#2b2521" stroke="#f4f6f8" stroke-width="1.2"/>
</svg>`,
  // couverture : tranche noire agrafée, bandeau OSMOSE, photo rouge, titres
  mag: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="96" height="96" aria-hidden="true">
<path d="M8 3.5h17.5a1.5 1.5 0 0 1 1.5 1.5v22a1.5 1.5 0 0 1-1.5 1.5H8z" fill="#f4eddf" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M27 6.5h2.2M27 9.5h2.2M27 12.5h2.2" stroke="${INK}" stroke-opacity=".5" stroke-width="1" stroke-linecap="round"/>
<rect x="4" y="3.5" width="5.4" height="25" rx="1.4" fill="${INK}"/>
<rect x="5.5" y="9" width="2.4" height="1.5" rx=".4" fill="#c9c2b3"/><rect x="5.5" y="21" width="2.4" height="1.5" rx=".4" fill="#c9c2b3"/>
<rect x="11.2" y="6" width="14" height="5.2" fill="${INK}"/>
<g fill="#f4eddf"><rect x="12.4" y="7.6" width="1.4" height="2"/><rect x="14.6" y="7.6" width="1.4" height="2"/><rect x="16.8" y="7.6" width="1.4" height="2"/><rect x="19" y="7.6" width="1.4" height="2"/><rect x="21.2" y="7.6" width="1.4" height="2"/><rect x="23.2" y="7.6" width="1" height="2"/></g>
<rect x="11.2" y="13" width="14" height="9.8" fill="#d8402f"/>
<circle cx="18.2" cy="16.8" r="2.4" fill="#f4eddf"/><path d="M13.2 22.8a5 4.4 0 0 1 10 0z" fill="#f4eddf"/>
<rect x="11.2" y="24.4" width="9.6" height="1.5" fill="${INK}"/><rect x="11.2" y="26.7" width="6" height="1.1" fill="${INK}" opacity=".6"/>
</svg>`,
  // sticker jaune au coin décollé, « O » d'Osmose
  sticker: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="96" height="96" aria-hidden="true">
<path d="M10 3h12q7 0 7 7v8L18 29h-8q-7 0-7-7V10Q3 3 10 3z" fill="#fff" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M10 6h12q4 0 4 4v7L17 26h-7q-4 0-4-4V10q0-4 4-4z" fill="#ffd23f"/>
<circle cx="14.6" cy="14.6" r="4.6" fill="none" stroke="${INK}" stroke-width="3.2"/>
<path d="M29 18L18 29l3.6-7.6z" fill="#ece5d6" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`,
};

// Les images pour le canvas (chargées une seule fois)
const IMG = {};
export function lootImage(kind) {
  if (!IMG[kind]) {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LOOT_SVG[kind]);
    IMG[kind] = img;
  }
  return IMG[kind];
}

// Phrases du pop-up quand Talya ramasse un objet
export const LOOT_TEXT = {
  cd: {
    title: 'Un CD de Seta',
    lines: [
      'Pièce de collection, désormais propriété de Talya.',
      'Florian ne retrouvera plus jamais l’ordre de sa collection.',
      'Un CD de plus pour la platine de Talya.',
      'Dédicacé à la patte. Sans autorisation.',
    ],
  },
  mag: {
    title: 'Un magazine Osmose',
    lines: [
      'À lire plus tard. Ou à mâchouiller, on verra.',
      'Un vrai numéro, en papier. Une espèce rare.',
      'Talya l’emporte. Florian cherchera longtemps.',
      'L’édition collector : celle qui disparaît du salon.',
    ],
  },
  sticker: {
    title: 'Un sticker Osmose',
    lines: [
      'Décollé tout doucement. À coller sur le panier.',
      'Il ira sur la porte du frigo, bien en vue.',
      'Un sticker de plus pour la collection.',
      'Le coin décollé, c’est la signature de Talya.',
    ],
  },
};
