# RP Talya

Un jeu de rôle où Talya décide de tout. Cadeau pour les 30 ans de Florian.

En ligne : https://amelienito.github.io/Hb/

## Missions

- **Réacteur** : puzzle de lasers, 8 niveaux puis 2 bonus au choix. On fait pivoter les miroirs pour allumer tous les cœurs sans toucher les capteurs ; le faisceau repart de l'émetteur à chaque coup.
- **Rivaux Marvel** : duel de 60 secondes contre un fantôme (box-office, durées, sorties, casting, comics, arrivées dans le MCU).
- **Flair** : enquête au nez dans une forêt de nuit, 5 affaires. On maintient « Flairer » pour voir les odeurs et on suit la bonne.
- **Opération chaussette** : infiltration, 5 niveaux. Voler les chaussettes sans entrer dans le champ de vision, puis rentrer au panier.

## Organisation

- `index.html` : page unique, charge `src/app.js`.
- `src/app.js` : routage (`#/`, `#/reacteur`, `#/rivaux`). Chaque écran exporte `mount(racine)`.
- `src/core/` : sauvegarde locale, sons synthétisés, utilitaires, dessins de Talya.
- `src/games/reacteur/` : moteur pur (`engine.js`), rendu canvas, niveaux générés.
- `src/games/rivaux/` : données Marvel (`data.js`) et jeu.
- `src/core/topdown.js` : socle des jeux vus de dessus (joystick, collisions, Talya vue de dessus).
- `src/games/flair/` : génération de la forêt et des pistes (`world.js`), jeu.
- `src/games/chaussette/` : règles pures (`world.js`), niveaux, solveur, jeu.
- `tools/gen-levels.mjs` régénère les niveaux de Réacteur ; `tools/check.mjs`, `tools/check-chaussette.mjs` et `tools/check-flair.mjs` vérifient que tout est faisable.
- Ajouter `?bot` avant le `#` (ex. `/?bot#/chaussette`) lance un pilote automatique de test.

Pour ajouter un jeu : créer `src/games/<nom>/game.js` avec `mount()`, l'ajouter dans `ROUTES` (src/app.js) et une carte dans `src/hub.js`.
