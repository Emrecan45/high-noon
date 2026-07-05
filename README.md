<div align="center">

![High Noon](docs/logo.png)

**High Noon** est un duel de western 1v1 en 3D à la première personne, jouable dans le navigateur. Attends la cloche, dégaine, vise et tire avant l'adversaire. En ligne contre un autre joueur, ou contre trois pistoleros contrôlés par l'IA.

![Version](https://img.shields.io/badge/version-v1.1-blue)
![Three.js](https://img.shields.io/badge/three.js-r170-049EF4)
![Supabase](https://img.shields.io/badge/supabase-realtime-3ECF8E)
![Licence](https://img.shields.io/badge/licence-MIT-lightgrey)

</div>

## 🌐 Jouer dans le navigateur

**▶ Jouer maintenant : [emrecan45.github.io/high-noon](https://emrecan45.github.io/high-noon/)**

Aucune installation : le jeu tourne directement dans le navigateur, sur ordinateur comme sur **mobile et tablette** (visée tactile et boutons dédiés).

## Gameplay

- **Le signal** : tirer avant la cloche = tir anticipé, manche perdue.
- **La visée compte** : une balle dans la tête tue net, une balle dans le corps blesse (deux blessures tuent). Un tir manqué impose un rechargement.
- **L'esquive** : une roulade par manche (touches Q/D ou A/E). Si l'adversaire tire pendant la roulade, il rate. S'il attend la fin, tu es à sa merci.
- **Les modificateurs** : crépuscule, brume, longue portée, rafales de vent. Chaque manche change les conditions.
- **La remontada** : le perdant d'une manche choisit un avantage parmi trois tirés au hasard (huit perks : rechargement rapide, double esquive, visée assistée, gilet, sang-froid, dégainé souple, chapeau baissé, éperons).
- **Premier à 3 manches gagnées.**
- **Interface bilingue** : anglais par défaut, français d'un clic sur le drapeau. Musique et effets sonores réglables depuis l'accueil.

## Adversaires IA

| Pistolero | Style |
|---|---|
| 🤠 Billy la Gâchette | Très rapide, mais craque sous la pression |
| 🌵 El Rápido | Le plus rapide de l'Ouest, vise la tête |
| 🥃 Doc Silence | Lent au signal, punit chaque faute |

## Stack technique

- **Three.js** : rendu 3D, modèles low-poly 100% procéduraux (aucun asset externe)
- **Web Audio API** : sons et musique d'ambiance entièrement synthétisés (cloche, coups de feu, ricochets, sifflements)
- **Supabase Realtime** : matchmaking par présence et échange d'événements de duel
- **Vite** : build et dev server

Le netcode est insensible à la latence : chaque client mesure localement ses temps de réaction relatifs au signal, et seuls des événements discrets (tir, esquive, blessure) sont échangés. Le joueur touché est autoritaire sur ses propres esquives et dégâts.

## Lancer en local

> Pour les développeurs souhaitant lancer le jeu depuis le code.

```bash
npm install
npm run dev
```
