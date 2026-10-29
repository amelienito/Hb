# RP Talya

Un jeu de rôle où Talya décide de tout. Cadeau pour les 30 ans de Florian.

En ligne : https://amelienito.github.io/Hb/

## Missions

- **Réacteur** : puzzle de lasers, 7 niveaux puis 2 bonus. On fait pivoter les miroirs pour allumer tous les cœurs sans toucher les capteurs ; le faisceau repart de l'émetteur à chaque coup. Après 7 s sans rien toucher, un indice est proposé ; « Voir la réponse » arrive après 60 s ou 3 indices.
- **Rivaux Marvel** : duel de 60 secondes contre un fantôme (box-office, durées, sorties, casting, comics, arrivées dans le MCU).
- **Flair** : enquête au nez dans une forêt de nuit, 5 affaires. Chaque appui sur « Flairer » montre les odeurs 3 secondes, avec 30, 20 ou 10 flairs par affaire selon le mode (facile, normal, difficile). Mode gaucher·e pour mettre le bouton à gauche. Hérissons, renards, guêpes, moufettes et sangliers.
- **Opération Osmose** (dossier `chaussette`) : infiltration, 5 niveaux. Voler les CD de Seta, les magazines et les stickers Osmose sans entrer dans le champ de vision, puis rentrer au panier. Reprise au dernier objet volé (à un moment calme de la ronde), modes facile, normal et difficile ; en difficile, Arnaud rejoint les niveaux 3 à 5.
- **Tu préfères ?** : au choix, des dilemmes Marvel légers (24) ou cornéliens (20), 12 tirés au hasard par partie, puis un profil de fan. Textes dans `src/games/prefs/data.js`.
- **L'interview** : entretien façon magazine, Amélien pose 14 questions, Talya répond en woofs (un mot = un woof). Textes dans `src/games/interview/data.js` : chaque réponse « en clair » sert de patron et n'est jamais affichée.

## Organisation

- `index.html` : page unique, charge `src/app.js`.
- `src/app.js` : routage (`#/`, `#/reacteur`, `#/rivaux`, `#/flair`, `#/chaussette`, `#/prefs`, `#/interview`). Chaque écran exporte `mount(racine)`.
- `src/core/nav.js` : ordre des missions, barre du haut commune avec le bouton « Jeu suivant ». `src/core/modes.js` : difficulté par jeu.
- `src/core/` : sauvegarde locale, sons synthétisés, utilitaires, dessins de Talya.
- `src/games/reacteur/` : moteur pur (`engine.js`), rendu canvas, niveaux générés.
- `src/games/rivaux/` : données Marvel (`data.js`) et jeu.
- `src/core/topdown.js` : socle des jeux vus de dessus (joystick, collisions, Talya vue de dessus).
- `src/games/flair/` : génération de la forêt et des pistes (`world.js`), jeu.
- `src/games/chaussette/` : règles pures (`world.js`), niveaux, solveur, jeu.
- `tools/gen-levels.mjs` régénère les niveaux de Réacteur ; `tools/check.mjs`, `tools/check-chaussette.mjs` et `tools/check-flair.mjs` vérifient que tout est faisable.
- Ajouter `?bot` avant le `#` (ex. `/?bot#/chaussette`) lance un pilote automatique de test.

Pour ajouter un jeu : créer `src/games/<nom>/game.js` avec `mount()`, l'ajouter dans `ROUTES` (src/app.js) et une carte dans `src/hub.js`.
