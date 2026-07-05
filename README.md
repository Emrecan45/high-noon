# High Noon 🤠

Duel de western 1v1 en 3D à la première personne, jouable dans le navigateur. Attends la cloche, dégaine, vise et tire avant l'adversaire. En ligne contre un autre joueur, ou contre trois pistoleros contrôlés par l'IA.

## Gameplay

- **Le signal** : tirer avant la cloche = tir anticipé, manche perdue.
- **La visée compte** : une balle dans la tête tue net, une balle dans le corps blesse (deux blessures tuent). Un tir manqué impose un rechargement.
- **L'esquive** : une roulade par manche (touches Q/D ou A/E). Si l'adversaire tire pendant la roulade, il rate. S'il attend la fin, tu es à sa merci.
- **Les modificateurs** : crépuscule, brume, longue portée, rafales de vent. Chaque manche change les conditions.
- **La remontada** : le perdant d'une manche choisit un avantage (rechargement rapide, double esquive, visée assistée).
- **Premier à 3 manches gagnées.**

## Adversaires IA

| Pistolero | Style |
|---|---|
| 🤠 Billy la Gâchette | Très rapide, mais craque sous la pression |
| 🌵 El Rápido | Le plus rapide de l'Ouest, vise la tête |
| 🥃 Doc Silence | Lent au signal, punit chaque faute |

## Stack technique

- **Three.js** : rendu 3D, modèles low-poly 100% procéduraux (aucun asset externe)
- **Web Audio API** : sons synthétisés (cloche, coups de feu, ricochets)
- **Supabase Realtime** : matchmaking par présence et échange d'événements de duel
- **Vite** : build et dev server

Le netcode est insensible à la latence : chaque client mesure localement ses temps de réaction relatifs au signal, et seuls des événements discrets (tir, esquive, blessure) sont échangés. Le joueur touché est autoritaire sur ses propres esquives et dégâts.

## Lancer en local

```bash
npm install
npm run dev
```

## Activer le mode en ligne

1. Créer un projet gratuit sur [supabase.com](https://supabase.com)
2. Copier l'URL du projet et la clé `anon` dans `src/config.js` :

```js
export const SUPABASE_URL = "https://xxxx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJ...";
```

Aucune table n'est nécessaire : le jeu n'utilise que les canaux Realtime (broadcast + presence). Sans configuration, le bouton « Duel en ligne » propose directement l'IA.

## Déployer

```bash
npm run build
```

Le dossier `dist/` se déploie tel quel sur GitHub Pages ou itch.io (le `base: "./"` de Vite rend le build relocalisable).

## Licence

MIT
