# RP Talya

Un jeu de rôle où Talya décide de tout. Cadeau pour les 30 ans de Florian.

En ligne : https://amelienito.github.io/hb/

## Missions

- **Réacteur** : puzzle de lasers en 12 niveaux. On fait pivoter les miroirs pour allumer tous les cœurs sans toucher les capteurs.
- **Rivaux Marvel** : duel de 60 secondes contre un fantôme (box-office, durées, premières apparitions en comics).
- **Flair** et **Opération chaussette** : à venir.

## Organisation

- `index.html` : page unique, charge `src/app.js`.
- `src/app.js` : routage (`#/`, `#/reacteur`, `#/rivaux`). Chaque écran exporte `mount(racine)`.
- `src/core/` : sauvegarde locale, sons synthétisés, utilitaires, dessins de Talya.
- `src/games/reacteur/` : moteur pur (`engine.js`), rendu canvas, niveaux générés.
- `src/games/rivaux/` : données Marvel (`data.js`) et jeu.
- `tools/gen-levels.mjs` : régénère les niveaux de Réacteur. `tools/check.mjs` vérifie qu'ils sont tous faisables.

Pour ajouter un jeu : créer `src/games/<nom>/game.js` avec `mount()`, l'ajouter dans `ROUTES` (src/app.js) et une carte dans `src/hub.js`.
