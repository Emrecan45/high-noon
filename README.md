<div align="center">

![High Noon](docs/logo.png)

**High Noon** est un duel de western 1v1 en 3D à la première personne, jouable dans le navigateur. Attends la cloche, dégaine, vise et tire avant l'adversaire. En ligne contre un autre joueur, ou contre trois pistoleros contrôlés par l'IA.

![Version](https://img.shields.io/badge/version-v1.0-blue)
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

- **Le signal** : tirer avant la cloche = tir anticipé, manche perdue.
- **La visée compte** : une balle dans la tête tue net, une balle dans le corps blesse (deux blessures tuent). Un tir manqué impose un rechargement.
- **Le dégainé désaxe la visée** : au signal, le viseur remonte avec un décalage aléatoire et flotte en permanence (respiration du bras) - il faut rattraper la cible avant de tirer.
- **L'esquive** : 2 roulades par manche (touches Q/D ou A/E). On peut tirer pendant la roulade, mais le viseur tremble fort. Si l'adversaire tire pendant la roulade, il rate. S'il attend la fin, tu es à sa merci.
- **Le soleil aveugle** : des éblouissements aléatoires peuvent te blinder avant le signal si tu regardes dans sa direction. Détourne les yeux pour t'en protéger.
- **La brume cache** : par bancs, elle dissimule l'adversaire par intermittence puis se dissipe - pareil pour les deux joueurs en ligne.
- **Premier à 3 manches gagnées.**



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

> Interface bilingue (anglais par défaut, français d'un clic sur le drapeau), musique et effets sonores réglables depuis l'accueil.



## 🌍 Multijoueur en ligne

Le duel en ligne passe par **Supabase Realtime** : matchmaking par présence, puis échange direct d'événements de duel entre les deux joueurs. Le netcode est insensible à la latence - chaque client mesure localement son propre temps de réaction par rapport au signal, et seuls des événements discrets (tir, esquive, blessure) sont échangés ; le joueur touché reste autoritaire sur ses propres esquives et dégâts. Si aucun adversaire n'est trouvé, l'IA prend le relais.



## 🛠️ Stack technique

- **Three.js** : rendu 3D, modèles low-poly 100% générés (aucun asset externe)
- **Web Audio API** : sons et musique d'ambiance entièrement synthétisés (cloche, coups de feu, ricochets, sifflements)
- **Supabase Realtime** : matchmaking et réseau du duel en ligne
- **Vite** : build et serveur de développement



## ⚙️ Lancer en local

> Pour les développeurs souhaitant lancer le jeu depuis le code.

```bash
npm install
npm run dev
```



## 📁 Structure du projet

```
high-noon/
├── index.html         # Écrans HTML (menus, HUD, aide)
├── src/
│   ├── main.js        # Point d'entrée, menus, i18n, audio
│   ├── duel.js         # Machine à états du duel (signal, tir, esquive, manches)
│   ├── ai.js           # Personnalités et comportement de l'IA
│   ├── net.js          # Matchmaking et protocole réseau (Supabase Realtime)
│   ├── scene.js        # Arène 3D, éclairages, modificateurs de manche
│   ├── cowboy.js        # Personnage adverse et ses animations
│   ├── viewmodel.js    # Revolver en vue subjective
│   ├── audio.js        # Moteur audio (effets sonores synthétisés)
│   ├── music.js        # Musique d'ambiance synthétisée
│   ├── ui.js           # Écrans, HUD, textes
│   ├── i18n.js         # Traductions français / anglais
│   ├── perks.js        # Avantages de remontada
│   ├── modifiers.js    # Modificateurs de manche
│   └── rng.js          # Générateur pseudo-aléatoire à seed partagée
├── docs/               # Logo et captures d'écran du README
├── LICENSE             # Licence du projet (MIT)
└── package.json
```



## 🎨 Crédits

Ce projet est **100% généré** : aucun asset graphique ou sonore externe (modèles Three.js, textures, sons et musique synthétisés en Web Audio). Polices : [Rye](https://fonts.google.com/specimen/Rye) et [Special Elite](https://fonts.google.com/specimen/Special+Elite) via Google Fonts.
