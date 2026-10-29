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
  { a: ['Voler avec les ailes de Falcon', { S: -0.5, C: -0.5 }, 'Sam Wilson : il a hérité du bouclier et des embouteillages aériens.'],
    b: ['Voler avec la cape de Doctor Strange', { C: 1, F: -0.5 }, 'Elle a son caractère. Parfois, elle décide à ta place.'] },
  { a: ['Avoir Groot comme coloc', { C: 1, F: 0.5 }, 'Trois mots de vocabulaire, zéro dispute sur la vaisselle.'],
    b: ['Avoir Wong comme coloc', { C: 0.5, F: 1 }, 'Il garde la bibliothèque, écoute Beyoncé et note tes retards.'] },
  { a: ['Rétrécir comme Ant-Man', { C: -0.5, F: 1 }, 'Parfait pour finir les miettes au fond du paquet. Talya approuve.'],
    b: ['Grandir comme Giant-Man', { C: -0.5, F: 0.5, V: 0.5 }, 'Plus jamais besoin d’escabeau. Plus jamais de porte non plus.'] },
  { a: ['Avoir Hulk comme garde du corps', { S: -0.5, F: 0.5 }, 'Personne ne te double dans la file. Personne ne reste dans la file, d’ailleurs.'],
    b: ['Avoir Vision comme garde du corps', { C: 0.5, F: -0.5 }, 'Il traverse les murs et te cuisine un paprikash très discutable.'] },
  { a: ['Une journée dans la sitcom de Wanda', { V: 0.5, C: 0.5, F: -0.5 }, 'En noir et blanc, rires enregistrés. Puis ça se gâte.'],
    b: ['Une journée de bureau à la TVA', { C: 1, F: 0.5 }, 'Moquette des années 70, file d’attente infinie, et Miss Minutes qui surveille.'] },
  { a: ['Être le meilleur ami de Peter Parker', { C: -1, F: 0.5 }, 'Comme Ned : l’homme dans le fauteuil, le meilleur poste du film.'],
    b: ['Être le meilleur ami de Tony Stark', { S: 1 }, 'Comme Rhodey : une armure de prêt et des remontrances à vie.'] },
  { a: ['Combattre aux côtés des Valkyries', { C: 0.5, V: -0.5, F: 0.5 }, 'Un pégase, une épée, et une bouteille à la main.'],
    b: ['Combattre aux côtés des Dora Milaje', { C: -0.5, V: -0.5, F: -0.5 }, 'Pas de perruque, pas de pitié.'] },
  { a: ['L’armure rouge et or de la Mark III', { S: 1, M: 0.5 }, 'Le classique : celle du premier vrai vol.'],
    b: ['Le costume de Spider-Man fait maison', { C: -1, F: 0.5 }, 'Un sweat à capuche, des lunettes de soudure, et beaucoup de débrouille.'] },
  { a: ['Une saison de Daredevil', { M: -0.5, F: -1, C: -1 }, 'Le plan-séquence du couloir. Tu as retenu ton souffle.'],
    b: ['Une saison de Moon Knight', { C: 1, V: 0.5 }, 'Trois personnalités, un dieu égyptien, et toujours pas une nuit complète.'] },
  { a: ['Garder le Tesseract chez toi', { C: 1, V: 0.5 }, 'Une lampe de chevet qui ouvre des portails. Et attire les ennuis.'],
    b: ['Garder le walkman de Star-Lord', { F: 1, C: 0.5 }, 'Avec la cassette dedans. Les deux faces, en boucle.'] },
  { a: ['Un entraînement avec Black Widow', { F: -1, C: -1 }, 'Tu ressors avec deux bleus et énormément de respect.'],
    b: ['Un entraînement avec Shang-Chi', { C: -0.5, F: 0.5 }, 'Arts martiaux dans un bus le matin, karaoké le soir.'] },
  { a: ['Que les X-Men débarquent enfin pour de bon', { M: -0.5, C: 0.5 }, 'Wolverine, Tornade, et soixante ans de comics à rattraper.'],
    b: ['Que les Quatre Fantastiques aient leur trilogie', { C: 1, M: 0.5 }, 'La première famille de Marvel. Il était temps.'] },
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
  ['Les Gardiens de la Galaxie Vol. 3 est le meilleur film Marvel.', { C: 1, F: 0.5 }, 'Rocket, Creep en acoustique dès la première scène. Tu as pleuré.', { C: -0.5 }, 'Trop d’émotions pour un raton laveur. C’est ton droit.'],
  ['Iron Man, le premier, reste le meilleur film du MCU.', { S: 1, M: 0.5 }, 'Une grotte, une boîte de ferraille, et tout commence.', { S: -0.5, C: 0.5 }, 'Il a vieilli. Tony aussi, remarque.'],
  ['Doctor Strange aurait pu sauver Tony.', { S: 1, F: -0.5 }, 'Une chance sur 14 000 605, et il l’a laissée filer.', { S: -0.5, C: 0.5 }, 'C’était la seule issue. Tu as compris le plan.'],
  ['Des films de super-héros, on en a eu assez.', { M: -1, F: -0.5 }, 'Fatigue des super-héros. Tu as raison, et pourtant tu es là.', { M: 1 }, 'Jamais trop. Tu as déjà ton billet pour le prochain.'],
  ['Hawkeye est l’Avenger le plus courageux.', { S: -0.5, C: -1, V: -0.5 }, 'Un arc, des flèches, et une armée d’aliens en face. Respect.', { C: 0.5, F: 0.5 }, 'Un arc contre Thanos. On va dire que c’est du courage.'],
  ['Deadpool & Wolverine est un chef-d’œuvre.', { F: 1, M: -0.5 }, 'Tu as hurlé à chaque caméo. Les voisins aussi.', { F: -0.5 }, 'Trop de vannes, pas assez de film. Avis respectable.'],
  ['Black Panther est le meilleur film solo du MCU.', { V: -0.5, F: -0.5, C: -0.5 }, 'Wakanda forever. Et Killmonger, le méchant qui marquait un point.', { F: 0.5, S: 0.5 }, 'Très bon, mais tu as un autre favori, et tu vas le défendre.'],
  ['Tobey Maguire reste le meilleur Spider-Man.', { M: -0.5, F: -0.5 }, 'Le baiser à l’envers sous la pluie. Classique.', { M: 0.5, F: 0.5 }, 'Tom Holland, Andrew Garfield : tu as l’embarras du choix.'],
  ['Loki aurait fait un meilleur grand méchant que Thanos.', { V: 1, F: 0.5 }, 'Glorieux dessein. Thanos n’avait pas sa classe.', { V: -0.5, C: 0.5 }, 'Thanos était inévitable. Loki, juste en retard.'],
  ['La meilleure armure de Tony, c’est la Hulkbuster.', { S: 1, F: 0.5 }, 'Une armure entière pour calmer un ami. Romantique, à sa façon.', { M: 0.5, C: 0.5 }, 'La Mark 50 et ses nanotechnologies. Tu vis avec ton temps.'],
  ['Ant-Man est le héros le plus drôle du MCU.', { F: 1, C: -0.5 }, 'Paul Rudd ne vieillit pas et ne rate jamais une vanne.', { F: 0.5, C: 1 }, 'Thor et Rocket sont là. Désolé, Scott.'],
  ['Les Éternels méritaient mieux.', { C: 1, M: -0.5 }, 'Dix héros, sept mille ans d’histoire : un seul film, c’était trop court.', { C: -0.5, F: 0.5 }, 'Deux heures et demie de cosmos. Tu as dormi, avoue.'],
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

// Nombre de questions par partie (tirées au hasard dans chaque liste).
export const PER_GAME = 12;
