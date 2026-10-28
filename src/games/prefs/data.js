// Contenu de « Tu préfères ? ». Chaque réponse pousse le profil sur cinq axes :
//   S : Team Stark (+) / Team Rogers (−)        C : cosmique (+) / terre-à-terre (−)
//   M : fidèle du MCU (+) / puriste des comics (−)
//   V : âme de méchant (+) / cœur de héros (−)    F : humour (+) / gravité (−)

export const DILEMMAS = [
  { a: ['Avoir l’armure Mark 85', { S: 1, M: 0.5 }, 'Facile : il suffit d’être milliardaire et d’avoir un garage.'],
    b: ['Pouvoir soulever Mjolnir', { S: -1, C: 0.5 }, 'Tu te crois digne. Steve aussi : il a mis huit films à le prouver.'] },
  { a: ['Une soirée chez Tony Stark', { S: 1, F: 0.5 }, 'Bar ouvert, ego à volonté, et un majordome qui s’appelle J.A.R.V.I.S.'],
    b: ['Un barbecue chez Thor à New Asgard', { C: 0.5, F: 1 }, 'Prévois des tasses en rab : quand il en veut une autre, il casse la première.'] },
  { a: ['Le bouclier de Captain America', { S: -1, V: -0.5 }, 'Du vibranium qui revient toujours. Comme Steve.'],
    b: ['Les toiles de Spider-Man', { C: -1, F: 0.5 }, 'Liberté totale, à condition d’avoir un immeuble à chaque coin de rue.'] },
  { a: ['Vivre au Wakanda', { C: -0.5, V: -0.5, F: -0.5 }, 'Le meilleur réseau de transport de la planète. Et Shuri au service après-vente.'],
    b: ['Vivre à Asgard, avant Ragnarok', { C: 1 }, 'Magnifique. Jusqu’au jour où Hela rentre à la maison.'] },
  { a: ['Un dîner sérieux avec Doctor Strange', { C: 0.5, F: -1 }, 'Il a vu 14 000 605 futurs. Dans aucun tu ne finis le dessert.'],
    b: ['Un karaoké avec Star-Lord', { C: 0.5, F: 1 }, 'Awesome Mix Vol. 1 à fond, chorégraphie douteuse incluse.'] },
  { a: ['Avoir le cerveau de Shuri', { S: 0.5, V: -0.5, F: -0.5 }, 'Tu aurais réparé le Mac mini avant que Talya ne le mange.'],
    b: ['Avoir l’humour de Deadpool', { F: 1, M: -0.5, V: 0.5 }, 'Tu brises le quatrième mur. Salut Florian, joyeux anniversaire.'] },
  { a: ['Être Avenger en 2012, à New York', { F: 0.5, M: 0.5 }, 'Le shawarma d’après-bataille. La vraie récompense.'],
    b: ['Être Avenger en 2023, pour Endgame', { F: -1 }, 'Tu sauves l’univers et tu pleures à l’enterrement. Ambiance.'] },
  { a: ['Rejoindre les Gardiens de la Galaxie', { C: 1, F: 0.5 }, 'Tu seras Groot de cœur. Il dit que c’est un compliment.'],
    b: ['Rejoindre les Thunderbolts*', { C: -0.5, V: 0.5, F: -0.5 }, 'Une bande de bras cassés qui sauve le monde. Tu te sens chez toi.'] },
  { a: ['Porter le gant de Thanos une journée', { V: 1, C: 0.5 }, 'Un seul claquement. Pour ranger l’appartement, promis.'],
    b: ['Remonter le temps avec les Particules Pym', { V: -0.5, C: -0.5 }, 'Retour vers le futur ne marche pas comme ça, tu le sais.'] },
  { a: ['Revoir Endgame au cinéma sans rien savoir', { M: 1 }, 'Le « Avengers, rassemblement » dans une salle pleine. Imbattable.'],
    b: ['Lire Secret Wars de 1984 en avant-première absolue', { M: -1 }, 'Puriste. Tu as déjà ton avis sur l’adaptation, et il est sévère.'] },
  { a: ['Le Loki de Tom Hiddleston', { V: 1, F: 1 }, 'Glorieux dessein. Le chouchou du public, et il le sait.'],
    b: ['Le Thanos de Josh Brolin', { V: 1, F: -1, C: 0.5 }, 'Inévitable. Le seul méchant avec un plan de retraite.'] },
  { a: ['Que Tony soit encore vivant', { S: 1, M: 0.5 }, '« Je suis Iron Man. » Tu ne t’en es jamais remis, et c’est normal.'],
    b: ['Que Steve n’ait jamais rendu le bouclier', { S: -1 }, 'La danse avec Peggy était méritée. Mais quand même.'] },
];

// Hot takes : [affirmation, effet si d'accord, réaction d'accord, effet si pas d'accord, réaction pas d'accord]
export const TAKES = [
  ['Iron Man 3 est sous-côté.', { S: 1, F: 0.5 }, 'Le Mandarin était un coup de génie. Ou une arnaque. Les deux.', { S: -0.5, M: -0.5 }, 'Tu n’as jamais pardonné Trevor Slattery.'],
  ['Thor : Ragnarok est le meilleur Thor.', { F: 1 }, 'Le dieu du tonnerre, et surtout de la vanne.', { F: -1 }, 'Team Branagh : un Thor qui parle comme du Shakespeare.'],
  ['Spider-Man : No Way Home est meilleur qu’Endgame.', { F: 0.5, C: -0.5 }, 'Trois Spider-Man dans le même plan. Tu as crié, avoue.', { F: -0.5, M: 0.5 }, 'Rien ne bat Endgame. Rien.'],
  ['Captain America avait raison dans Civil War.', { S: -1 }, 'Team Cap. Les accords de Sokovie, très peu pour toi.', { S: 1 }, 'Team Iron Man. Il faut bien que quelqu’un signe.'],
  ['Thanos avait un peu raison.', { V: 1, C: 0.5 }, 'Parfaitement équilibré, comme toute chose. Inquiétant.', { V: -1 }, 'Merci. Les ressources, ça se partage, ça ne se claque pas.'],
  ['Les scènes après le générique, c’est sacré.', { M: 1 }, 'Tu restes jusqu’au bout, même pour un shawarma.', { M: -0.5, F: 0.5 }, 'Tu pars au générique. L’équipe de ménage te remercie.'],
  ['Les comics seront toujours meilleurs que les films.', { M: -1 }, 'Puriste assumé. Tu as un avis sur chaque numéro de 1963.', { M: 1 }, 'Le MCU t’a eu, et tu ne t’en excuses pas.'],
  ['Le multivers, il y en a un peu trop.', { M: -0.5, C: -0.5, F: -0.5 }, 'Retour aux fondamentaux. Une Terre, un Tony, ça suffisait.', { C: 1 }, 'Plus il y a de Terres, plus il y a de variantes de Talya.'],
];

export const AXES = [
  { k: 'S', minus: 'Team Rogers', plus: 'Team Stark' },
  { k: 'C', minus: 'Terre-à-terre', plus: 'Cosmique' },
  { k: 'M', minus: 'Puriste des comics', plus: 'Fidèle du MCU' },
  { k: 'V', minus: 'Cœur de héros', plus: 'Âme de méchant' },
  { k: 'F', minus: 'Gravité', plus: 'Humour' },
];

// Pour composer le titre du profil
export const TRAITS = {
  'S+': 'génie à la Stark', 'S-': 'boy-scout à la Steve',
  'C+': 'voyageur cosmique', 'C-': 'héros de quartier',
  'M+': 'fidèle du MCU', 'M-': 'puriste des comics',
  'V+': 'âme de méchant', 'V-': 'cœur de héros',
  'F+': 'farceur asgardien', 'F-': 'stratège sans sourire',
};

// L'Avenger intérieur : le personnage le plus proche du profil
export const MATCHES = [
  { name: 'Tony Stark', v: { S: 1, F: 0.6, M: 0.4 }, line: 'Génie, milliardaire, playboy, philanthrope. Et légèrement insupportable.' },
  { name: 'Steve Rogers', v: { S: -1, V: -1, F: -0.4 }, line: 'Tu peux faire ça toute la journée. Et tu le fais.' },
  { name: 'Thor', v: { C: 1, F: 1 }, line: 'Un dieu, un marteau, et une confiance en soi intacte.' },
  { name: 'Loki', v: { V: 1, F: 1, C: 0.4 }, line: 'Glorieux dessein, petites trahisons, gros charisme.' },
  { name: 'Doctor Strange', v: { C: 1, F: -1 }, line: 'Tu as un plan. Tu ne le dis à personne.' },
  { name: 'Star-Lord', v: { C: 1, F: 1, S: 0.4, M: 0.4 }, line: 'Le chef de bande qui danse pour sauver la galaxie.' },
  { name: 'Spider-Man', v: { C: -1, F: 1, V: -1 }, line: 'Le gentil du quartier, toujours en retard, toujours là.' },
  { name: 'T’Challa', v: { V: -1, F: -1, C: -0.5 }, line: 'Calme, digne, et la meilleure technologie de la planète.' },
  { name: 'Thanos', v: { V: 1, C: 1, F: -1 }, line: 'Inévitable. On en reparle après le claquement.' },
  { name: 'Deadpool', v: { F: 1, V: 0.5, M: -1 }, line: 'Tu viens de lire cette phrase en faisant un clin d’œil à la caméra.' },
  { name: 'Natasha Romanoff', v: { F: -1, C: -1, V: -0.3 }, line: 'Pas de superpouvoir, juste une longueur d’avance sur tout le monde.' },
  { name: 'Rocket', v: { F: 1, V: 0.5, C: 1 }, line: 'Mauvais caractère, cœur énorme, explosifs en option.' },
];

// Les réponses d'Amélien, pour afficher « d'accord avec Amélien sur x sur 20 » (à remplir plus tard).
// Format : 'a' ou 'b' pour chaque dilemme, puis 'oui' ou 'non' pour chaque hot take.
export const AMELIEN = null;
