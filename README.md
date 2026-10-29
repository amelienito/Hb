# RP Talya

Un jeu de rôle où Talya décide de tout. Cadeau pour les 30 ans de Florian.

En ligne : https://amelienito.github.io/Hb/

## Missions

- **Réacteur** : puzzle de lasers, 7 niveaux puis 2 bonus. On fait pivoter les miroirs pour allumer tous les cœurs sans toucher les capteurs ; le faisceau repart de l'émetteur à chaque coup. Si on bloque, un indice apparaît (35 s), puis « Voir la réponse » (90 s ou 3 indices).
- **Rivaux Marvel** : duel de 60 secondes contre un fantôme (box-office, durées, sorties, casting, comics, arrivées dans le MCU).
- **Flair** : enquête au nez dans une forêt de nuit, 5 affaires, 3 cœurs (mode facile, normal ou difficile). On maintient « Flairer » pour voir les odeurs et on suit la bonne, entre hérissons, renards, guêpes, moufettes et sangliers.
- **Opération chaussette** : infiltration, 5 niveaux. Voler les chaussettes sans entrer dans le champ de vision, puis rentrer au panier. Reprise à la dernière chaussette ramassée, modes facile, normal et difficile.
- **Tu préfères ?** : 12 dilemmes Marvel et 8 hot takes, puis un profil de fan. Les réponses d'Amélien peuvent être ajoutées dans `src/games/prefs/data.js` (`AMELIEN`) pour afficher le taux d'accord.
- **L'interview** : entretien façon magazine, Amélien pose 12 questions, Talya répond en woofs (un mot = un woof). Textes dans `src/games/interview/data.js` : chaque réponse « en clair » sert de patron et n'est jamais affichée.

## Organisation

- `index.html` : page unique, charge `src/app.js`.
- `src/app.js` : routage (`#/`, `#/reacteur`, `#/rivaux`, `#/flair`, `#/chaussette`, `#/prefs`, `#/interview`). Chaque écran exporte `mount(racine)`.
- `src/core/nav.js` : ordre des missions (bouton « Mission suivante »). `src/core/modes.js` : difficulté par jeu.
- `src/core/` : sauvegarde locale, sons synthétisés, utilitaires, dessins de Talya.
- `src/games/reacteur/` : moteur pur (`engine.js`), rendu canvas, niveaux générés.
- `src/games/rivaux/` : données Marvel (`data.js`) et jeu.
- `src/core/topdown.js` : socle des jeux vus de dessus (joystick, collisions, Talya vue de dessus).
- `src/games/flair/` : génération de la forêt et des pistes (`world.js`), jeu.
- `src/games/chaussette/` : règles pures (`world.js`), niveaux, solveur, jeu.
- `tools/gen-levels.mjs` régénère les niveaux de Réacteur ; `tools/check.mjs`, `tools/check-chaussette.mjs` et `tools/check-flair.mjs` vérifient que tout est faisable.
- Ajouter `?bot` avant le `#` (ex. `/?bot#/chaussette`) lance un pilote automatique de test.

Pour ajouter un jeu : créer `src/games/<nom>/game.js` avec `mount()`, l'ajouter dans `ROUTES` (src/app.js) et une carte dans `src/hub.js`.
