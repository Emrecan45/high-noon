<div align="center">

![High Noon](docs/logo.png)

**High Noon** est un duel de western 1v1 en 3D à la première personne, jouable dans le navigateur. Attends la cloche, dégaine, vise et tire avant l'adversaire. En duel classé contre un autre joueur, contre un ami par lien d'invitation, ou contre trois pistoleros contrôlés par l'IA.

![Version](https://img.shields.io/badge/version-v1.3-blue)
![Three.js](https://img.shields.io/badge/three.js-r170-049EF4)
![Supabase](https://img.shields.io/badge/supabase-realtime-3ECF8E)
![Licence](https://img.shields.io/badge/licence-MIT-lightgrey)

</div>



## 📷 Screenshots

| Menu principal | Gameplay |
|:-:|:-:|
| ![Menu](docs/screenshot_menu.png) | ![Gameplay](docs/screenshot_game.png) |



## 🌐 Jouer dans le navigateur

**▶ Jouer maintenant : [emrecan45.github.io/high-noon](https://emrecan45.github.io/high-noon/)**

Aucune installation : le jeu tourne directement dans le navigateur, sur ordinateur comme sur **mobile et tablette** (visée tactile et boutons dédiés).



## 🎮 Gameplay

- **La présentation du duel** : avant le premier échange, une intro cinématique met les deux pistoleros face à face, pseudo et rang affichés au-dessus, sur fond de soleil de plomb - pour planter l'ambiance.
- **Le signal** : tirer avant la cloche = tir anticipé, manche perdue.
- **La visée compte** : une balle dans la tête tue net, une balle dans le corps blesse (deux blessures tuent). Un tir manqué impose un rechargement.
- **Le dégainé désaxe la visée** : au signal, le viseur remonte avec un décalage aléatoire et flotte en permanence (respiration du bras) - il faut rattraper la cible avant de tirer.
- **L'esquive** : 2 pas de côté par manche (touches Q/D ou A/E), un vrai déplacement latéral engagé (bascule du corps et du regard). On peut tirer pendant l'esquive, mais le viseur tremble fort. Si l'adversaire tire pendant ton pas de côté, il rate. S'il attend la fin, tu es à sa merci.
- **Le soleil aveugle** : des éblouissements aléatoires peuvent te blinder avant le signal si tu regardes dans sa direction. Détourne les yeux pour t'en protéger.
- **La brume cache** : par bancs, elle dissimule l'adversaire par intermittence puis se dissipe - pareil pour les deux joueurs en ligne.
- **La kill cam** : le tir décisif passe au ralenti, l'écran vire sépia, le son s'étouffe et la caméra zoome sur le duelliste qui s'effondre.
- **Le plomb laisse des traces** : éclats de bois sur les bâtiments, poussière au sol, douilles éjectées au rechargement.
- **Musique de combat dédiée** : les duels basculent sur une piste tendue (basse pulsée, battement de cœur, nappe menaçante) distincte de la musique des menus.
- **Premier à 3 manches gagnées**, suivi d'une **page de fin de duel** : verdict ligne par ligne, score final, variation de rang et pièces gagnées, plus un récap du match (précision, balles tirées, tirs à la tête).



### 🎲 Manches à modificateurs

Chaque manche tire un modificateur météo qui change les conditions du duel - équiprobable, et jamais deux fois le même d'affilée.

| Modificateur | Effet |
|--|-|
| ☀️ Plein soleil | Conditions parfaites |
| 🌆 Crépuscule | Nuit tombée, silhouettes seulement |
| 🌫️ Brume | Visibilité réduite, bancs de brume qui cachent l'adversaire par intermittence |
| 💨 Rafales | Le vent fait trembler la visée |



### 📏 Distance du duel

Indépendamment du modificateur météo, chaque manche tire aussi silencieusement une distance de duel (aucune annonce à l'écran) :

| Distance | Effet |
|--|-|
| 🔫 Rapprochée (12 m) | Visée facilitée |
| 🤠 Moyenne (19 m) | Distance de référence |
| 🎯 Longue (35 m) | Visée nettement plus difficile |



### 🃏 Perks de remontada

Le perdant d'une manche choisit un avantage parmi trois tirés au hasard, pour le reste du duel.

| Perk | Effet |
|--|-|
| 🔫 Mains rapides | Rechargement 40% plus rapide après un tir manqué |
| 💨 Pas de côté | Une esquive supplémentaire à chaque manche |
| 🦅 Œil d'aigle | La visée pardonne : les tirs proches de la tête comptent |
| 🦺 Gilet renforcé | Un point de vie supplémentaire |
| ❄️ Sang-froid | Le viseur flotte beaucoup moins |
| ⚡ Dégainé souple | Le dégainé désaxe deux fois moins la visée |
| 🕶️ Chapeau baissé | L'éblouissement du soleil ne t'atteint plus |
| 🥾 Éperons | Tu peux ré-esquiver bien plus vite |



### 🤖 Adversaires IA

| Pistolero | Style |
|--|-|
| 🤠 Billy la Gâchette | Très rapide, mais craque sous la pression |
| 🌵 El Rápido | Le plus rapide de l'Ouest, vise la tête |
| 🥃 Doc Silence | Lent au signal, mais ne rate jamais une faute |



## 🕹️ Contrôles

| Action | Touche / geste |
|--|--|
| Viser | Souris (ou glisser sur tactile) |
| Tirer | Clic gauche (ou bouton 🔥 sur tactile) |
| Esquiver à gauche | `Q` ou `A` (ou bouton ◀ sur tactile) |
| Esquiver à droite | `D` ou `E` (ou bouton ▶ sur tactile) |

> Interface en 7 langues (anglais, français, espagnol, allemand, portugais, russe, turc), détectée automatiquement et changeable depuis l'accueil. Musique et effets sonores réglables.



## 🌍 Multijoueur en ligne

Le duel en ligne passe par **Supabase Realtime** : matchmaking par présence (les deux premiers duellistes disponibles s'affrontent), puis échange direct d'événements de duel entre les deux joueurs. Le netcode est insensible à la latence - seuls des événements discrets (tir, esquive, blessure) sont échangés, chacun calé sur une graine de manche partagée ; le joueur touché reste autoritaire sur ses propres esquives et dégâts.

**Duel entre amis** : depuis la barre d'amis, défier un ami en ligne ouvre un salon privé (ou envoie une invitation) - le duel démarre dès que l'ami arrive. Sur CrazyGames, l'invitation passe aussi par le bouton officiel de la plateforme (InstantMultiplayer pour les groupes). Les duels amicaux ne rapportent rien : ni rang, ni pièces - purement pour l'honneur. En 1v1, chaque manche n'est lancée que quand les deux joueurs sont prêts.

Le signal du duel est **imposé par l'hôte** : quand les deux joueurs sont prêts, l'hôte déclenche le « FEU ! » et le diffuse, l'autre client le calque à l'instant près - fini les manches désynchronisées où l'un tire pendant que l'autre attend.

**Le cercle d'amis** : une **barre latérale pleine hauteur à gauche** de l'accueil (façon Fortnite), sous la carte joueur, avec l'ajout d'ami épinglé tout en bas. Sur CrazyGames, elle liste directement tes **amis CrazyGames** (via `user.listFriends()`) avec leur avatar - un bouton DUEL si l'ami joue déjà et est en ligne, sinon INVITER via le système d'invitation CrazyGames. Hors CrazyGames, tu ajoutes des amis par pseudo. Un défi envoie une notification en temps réel qui s'affiche sur l'accueil de l'ami, et le duel démarre dès qu'il accepte.

Deux garde-fous réseau : impossible de **s'affronter soi-même** (deux onglets du même compte ne s'apparient jamais, l'identité de compte étant portée par la présence), et une fois les deux joueurs prêts (premier focus), le déroulé de la partie est **imposé** et continue même si un onglet perd le focus ou passe en arrière-plan.



## 🏆 Mode classé

Chaque joueur reçoit automatiquement un pseudo (« Player1234 », ou son pseudo CrazyGames s'il est connecté là-bas) porté par un compte anonyme Supabase. En **duel classé**, pseudo, tenue et **rang** (Novice, Tireur, Desperado, Légende de l'Ouest, selon les points accumulés) sont visibles par l'adversaire, et le **classement** affiche les 20 meilleurs pistoleros (tête du skin, pseudo, rang, points). Chaque match rapporte des pièces - le classé paie bien plus que l'IA, et les duels amicaux ne rapportent rien du tout.

Un garde-fou **anti-matchs arrangés** réduit les gains quand on rejoue le même adversaire dans la journée : points de rang et pièces divisés par deux au deuxième duel, plus aucun point de rang à partir du troisième.

| Résultat | Pièces | Points de rang (K=32) |
|--|--|--|
| 🏆 Victoire classée | +40 🪙 | montent |
| 💀 Défaite classée | +10 🪙 | descendent |
| 🤖 Victoire contre l'IA | +8 🪙 | - |
| 🤖 Défaite contre l'IA | +2 🪙 | - |

Le rang, les pièces et les achats sont gérés côté serveur par des fonctions Postgres (RLS + `security definer`), jamais par le client.



## 🤠 Profil, tenues & accessoires

Un clic sur la carte joueur (en haut à gauche de l'accueil) ouvre le profil, titré par ton **pseudo** (repris de CrazyGames, non modifiable) : le pistolero en **3D** à gauche (revolver au holster), à droite les statistiques de carrière (duels, précision, tirs à la tête, série de victoires). Les portraits de l'accueil, des amis et du classement sont **rendus depuis le même modèle 3D** que le personnage en jeu, pour un look cohérent partout. Un bouton **Modifier** ouvre la garde-robe : le pistolero tourne au centre pendant qu'on l'habille avec une **tenue** (8 tenues qui recolorent chapeau, chemise, pantalon, bandana), une **arme** (6 revolvers recolorés, visibles en vue subjective comme sur l'adversaire) et des **accessoires** cumulables par emplacement (moustache, barbe, cigare, cache-œil, étoile de shérif, poncho, plume). Le tout est visible par l'adversaire en ligne. Les pièces gagnées s'affichent en permanence en haut à droite.

## 📅 Défis quotidiens & hebdomadaires

Un **panneau Défis**, à droite de l'accueil, propose 3 objectifs **quotidiens** et 3 **hebdomadaires** - générés de façon déterministe à partir de la date (identiques pour tous les joueurs), avec barre de progression et récompense en pièces à réclamer. La progression est suivie **côté serveur** (table `challenge_progress` + RPC `challenge_state` / `claim_challenge`, protégés par RLS et incrémentés à la fin de chaque duel) et se réinitialise à chaque période. Objectifs types : jouer X duels, en gagner X, gagner X duels classés, placer X tirs à la tête, toucher X fois.

## 🏠 Accueil

L'accueil reprend les standards du genre, rangés proprement : barre d'amis à gauche, panneau de défis à droite, bouton **Notes de version** (historique des mises à jour daté), compteur de **joueurs en ligne** (présence Supabase en temps réel), et un pied de page **Conditions / Confidentialité** (modale). Les pièces sont affichées en permanence en haut à droite. Chaque action a son bruitage synthétisé (clics, équipement, pièces, roue).

## 🎡 La roue du destin

La boutique est une roue de la fortune : chaque tour coûte 50 🪙 et fait gagner une tenue, une arme ou un accessoire, tirés côté serveur selon leur rareté (les tenues et armes sont rares, les accessoires plus ou moins courants). Un doublon rembourse 25 🪙. Les pièces se gagnent en duel (le classé paie bien plus que l'IA) et, sur CrazyGames, avec une pub récompensée (+25 🪙) depuis l'accueil.



## 🎪 CrazyGames

Le jeu intègre le **SDK CrazyGames v3** : événements de cycle de jeu (`gameplayStart` / `gameplayStop`), pubs interstitielles entre les matchs, pub récompensée depuis l'accueil, connexion automatique au compte CrazyGames (pseudo repris, session sauvegardée via le module data pour suivre le joueur d'un appareil à l'autre), **liste d'amis CrazyGames** (`user.listFriends()`) dans la barre d'amis, et duels via le bouton d'invitation officiel et InstantMultiplayer. Hors CrazyGames, le SDK se désactive tout seul et le jeu fonctionne normalement.



## 🛠️ Stack technique

- **Three.js** : rendu 3D, modèles low-poly 100% générés (aucun asset externe)
- **Web Audio API** : sons et musique entièrement synthétisés (cloche, coups de feu, ricochets, sifflements), avec une piste de menu et une piste de combat distinctes
- **Supabase Realtime** : matchmaking et réseau du duel en ligne
- **Supabase Auth + Postgres** : comptes anonymes, rang, pièces, roue, amis et classement (RLS)
- **SDK CrazyGames** : pubs, liaison de compte et cycle de jeu sur CrazyGames
- **Vite** : build et serveur de développement



## ⚙️ Lancer en local

> Pour les développeurs souhaitant lancer le jeu depuis le code.

```bash
npm install
npm run dev
```

Le duel en ligne, les comptes et le classé demandent un projet [Supabase](https://supabase.com) : renseigner l'URL et la clé publishable dans `src/config.js`, exécuter `db/schema.sql` dans le SQL Editor et activer les anonymous sign-ins. Sans ça, le jeu reste jouable contre l'IA.



## 📁 Structure du projet

```
high-noon/
├── index.html         # Écrans HTML (menus, HUD, aide)
├── src/
│   ├── main.js        # Point d'entrée, menus, i18n, audio
│   ├── duel.js         # Machine à états du duel (signal, tir, esquive, manches)
│   ├── ai.js           # Personnalités et comportement de l'IA
│   ├── net.js          # Matchmaking (casual + classé) et protocole réseau
│   ├── account.js      # Comptes, profil, rang, pièces, amis (Supabase)
│   ├── skins.js        # Catalogue de tenues et portraits 3D générés
│   ├── pages.js        # Notes de version et textes légaux (FR/EN)
│   ├── sdk.js          # Intégration du SDK CrazyGames
│   ├── scene.js        # Arène 3D, éclairages, modificateurs de manche
│   ├── cowboy.js        # Personnage adverse et ses animations
│   ├── viewmodel.js    # Revolver en vue subjective
│   ├── audio.js        # Moteur audio (effets sonores synthétisés)
│   ├── music.js        # Musique d'ambiance synthétisée
│   ├── ui.js           # Écrans, HUD, textes
│   ├── i18n.js         # Traductions (EN, FR, ES, DE, PT, RU, TR)
│   ├── titles.js       # Rangs selon les points
│   ├── accessories.js  # Catalogue d'accessoires et icônes générées
│   ├── weapons.js      # Catalogue d'armes et icônes générées
│   ├── perks.js        # Avantages de remontada
│   ├── modifiers.js    # Modificateurs de manche
│   └── rng.js          # Générateur pseudo-aléatoire à seed partagée
├── docs/               # Logo et captures d'écran du README
├── db/                 # Schéma SQL (profils, skins, accessoires, rang, amis, défis)
├── LICENSE             # Licence du projet (MIT)
└── package.json
```



## 🎨 Crédits

Ce projet est **100% généré** : aucun asset graphique ou sonore externe (modèles Three.js, textures, sons et musique synthétisés en Web Audio). Polices : [Rye](https://fonts.google.com/specimen/Rye) et [Special Elite](https://fonts.google.com/specimen/Special+Elite) via Google Fonts.
