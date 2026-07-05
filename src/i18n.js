const STRINGS = {
  en: {
    tagline: "Duel in the sun",
    btnOnline: "ONLINE DUEL",
    btnAi: "CHALLENGE THE AI",
    btnHelp: "HOW TO PLAY",
    footer: "A game by",
    chooseOpp: "Choose your opponent",
    back: "BACK",
    helpTitle: "How to play",
    helpHtml:
      "<p><strong>Wait for the signal.</strong> Shooting before the bell is an early draw: round lost.</p>" +
      "<p><strong>On the signal, draw.</strong> Drawing throws your aim off: catch the target with your mouse and click to shoot. A headshot kills outright, a body shot wounds (two wounds kill). The hat doesn't count… but it flies.</p>" +
      "<p><strong>Your arm breathes.</strong> The reticle floats at all times, even more right after the draw. Learn to shoot in the lull of the sway.</p>" +
      "<p><strong>Missing costs you.</strong> After a missed shot you must reload before firing again.</p>" +
      "<p><strong>Dodge.</strong> Twice per round, press Q or D (or A/E) to dive sideways. You can still shoot mid-dive, but your aim shakes hard. If your opponent shoots during your roll, he misses. If he waits it out, you're at his mercy.</p>" +
      "<p><strong>Watch the sun.</strong> Random glares can blind you before the signal: look away from the sun. And beware of crows and slamming shutters: not everything sounds like the bell.</p>" +
      "<p><strong>Fog rolls in patches.</strong> It drifts across the street and can hide your opponent for a moment before clearing - the same way for both duelists.</p>" +
      "<p><strong>Round modifiers.</strong> Dusk, fog, gusts: every round changes the conditions. The duel's distance also varies silently from round to round.</p>" +
      "<p><strong>First to 3 rounds wins.</strong></p>" +
      "<p><strong>Comeback.</strong> The loser of a round picks one of three random perks for the rest of the duel.</p>",
    searchTitle: "Looking for an opponent…",
    searchHint: "Nobody on the horizon. A local gunslinger wants to fight.",
    btnSearchAi: "FIGHT THE AI",
    cancel: "CANCEL",
    btnContinue: "CONTINUE",
    btnQuit: "QUIT",
    perkTitle: "You lost the round… pick an edge",
    rematch: "REMATCH",
    menu: "MENU",
    lockTitle: "Click to draw your mouse",
    lockSub: "The duel resumes once your mouse is locked.",
    connectError: "Could not reach the matchmaking server.",
    waitingOpp: "Waiting for your opponent…",
    theOpponent: "YOUR OPPONENT",
    roundLabel: "ROUND {n} · {mod}",
    waitSignal: "Wait for the signal…",
    fire: "FIRE!",
    earlyDraw: "EARLY DRAW!",
    earlyDrawSub: "You drew before the signal…",
    oppEarly: "OPPONENT DREW EARLY",
    down: "DOWN!",
    youFell: "YOU FELL",
    missed: "Missed!",
    hitSub: "Hit!",
    hitArm: "Hit in the arm!",
    youDodged: "You dodged it!",
    dodgedSub: "Dodged!",
    hatOff: "You shot his hat off!",
    hatLost: "He shot your hat off!",
    oppPicks: "{name} picks: {perk}",
    reloading: "RELOADING…",
    dodgeLabel: "DODGE",
    hpLabel: "LIFE",
    roundWon: "ROUND WON",
    roundLost: "ROUND LOST",
    roundDraw: "DEAD ROUND",
    reasonEarlyYou: "Early draw. The round goes to {name}.",
    reasonEarlyOpp: "{name} drew before the signal. The round is yours.",
    reasonBothYou: "Both fell, but your bullet left first.",
    reasonBothOpp: "Both fell, the opponent's bullet left first.",
    reasonBothNone: "Nobody gets up. Dead round.",
    reasonOppDown: "Opponent bites the dust.",
    reasonYouDown: "You bite the dust.",
    reasonNobody: "Nobody fell. Again.",
    yourShot: "Your first shot",
    oppShot: "Opponent's shot",
    victory: "VICTORY!",
    defeat: "DEFEAT…",
    victoryDetail: "The town is yours. {score}.",
    defeatDetail: "{name} walks back to the saloon. {score}.",
    bestReflex: " Best reflex: {ms} ms.",
    waitingTitle: "WAITING…",
    waitingRematch: "Waiting for your opponent to accept the rematch.",
    fled: "FLED!",
    fledDetail: "Your opponent left town. Win by forfeit.",
    "mod.noon.name": "HIGH NOON",
    "mod.noon.desc": "Blazing sun overhead. Don't stare at it, it blinds.",
    "mod.dusk.name": "DUSK",
    "mod.dusk.desc": "Night falls, only silhouettes remain.",
    "mod.fog.name": "FOG",
    "mod.fog.desc": "A thick fog drowns the street.",
    "mod.wind.name": "GUSTS",
    "mod.wind.desc": "The wind shakes your arm and rolls the dust.",
    "perk.hands.name": "Fast hands",
    "perk.hands.desc": "Reload 40% faster after a missed shot.",
    "perk.step.name": "Sidestep",
    "perk.step.desc": "One extra dodge every round.",
    "perk.eye.name": "Eagle eye",
    "perk.eye.desc": "Forgiving aim: near-head shots count.",
    "perk.vest.name": "Padded vest",
    "perk.vest.desc": "One extra hit point.",
    "perk.calm.name": "Steady hand",
    "perk.calm.desc": "Your reticle floats far less.",
    "perk.draw.name": "Smooth draw",
    "perk.draw.desc": "Drawing throws your aim off half as much.",
    "perk.brim.name": "Low brim",
    "perk.brim.desc": "The sun's glare no longer reaches you.",
    "perk.spurs.name": "Spurs",
    "perk.spurs.desc": "You can dodge again much sooner.",
    "persona.nervous.desc": "Draws very fast but cracks under pressure. Frequent early draws.",
    "persona.rapido.desc": "The fastest gun in the West, aims for the head, sometimes misses everything.",
    "persona.patient.desc": "Slow on the signal, but never misses a mistake. Punishes dodges."
  },
  fr: {
    tagline: "Duel au soleil",
    btnOnline: "DUEL EN LIGNE",
    btnAi: "DÉFIER L'IA",
    btnHelp: "COMMENT JOUER",
    footer: "Un jeu de",
    chooseOpp: "Choisis ton adversaire",
    back: "RETOUR",
    helpTitle: "Comment jouer",
    helpHtml:
      "<p><strong>Attends le signal.</strong> Tirer avant la cloche est un tir anticipé : manche perdue.</p>" +
      "<p><strong>Au signal, dégaine.</strong> Le dégainé désaxe ta visée : rattrape la cible à la souris et clique pour tirer. Une balle dans la tête tue net, une balle dans le corps blesse (deux blessures tuent). Le chapeau ne compte pas… mais il vole.</p>" +
      "<p><strong>Ton bras respire.</strong> Le viseur flotte en permanence, encore plus juste après le dégainé. Apprends à tirer dans le creux du mouvement.</p>" +
      "<p><strong>Rater coûte cher.</strong> Après un tir manqué, il faut recharger avant de retirer.</p>" +
      "<p><strong>Esquive.</strong> Deux fois par manche, appuie sur Q ou D (ou A/E) pour plonger sur le côté. Tu peux tirer pendant la roulade, mais ta visée tremble fort. Si l'adversaire tire pendant ta roulade, il te rate. S'il attend la fin, tu es à sa merci.</p>" +
      "<p><strong>Gare au soleil.</strong> Des éblouissements aléatoires peuvent t'aveugler avant le signal : détourne les yeux du soleil. Et méfie-toi des corbeaux et des volets qui claquent : tout ne sonne pas comme la cloche.</p>" +
      "<p><strong>La brume avance par bancs.</strong> Elle dérive dans la rue et peut cacher l'adversaire un instant avant de se dissiper - pareil pour les deux duellistes.</p>" +
      "<p><strong>Manches à modificateurs.</strong> Crépuscule, brume, rafales : chaque manche change les conditions. La distance du duel varie aussi silencieusement à chaque manche.</p>" +
      "<p><strong>Premier à 3 manches gagnées.</strong></p>" +
      "<p><strong>Remontada.</strong> Le perdant d'une manche choisit un avantage parmi trois tirés au hasard, pour le reste du duel.</p>",
    searchTitle: "Recherche d'un adversaire…",
    searchHint: "Personne à l'horizon. Un pistolero local veut se battre.",
    btnSearchAi: "AFFRONTER L'IA",
    cancel: "ANNULER",
    btnContinue: "CONTINUER",
    btnQuit: "QUITTER",
    perkTitle: "Tu as perdu la manche… choisis un avantage",
    rematch: "REVANCHE",
    menu: "MENU",
    lockTitle: "Clique pour dégainer la souris",
    lockSub: "Le duel reprend quand ta souris est verrouillée.",
    connectError: "Connexion impossible au serveur de matchmaking.",
    waitingOpp: "En attente de l'adversaire…",
    theOpponent: "L'ADVERSAIRE",
    roundLabel: "MANCHE {n} · {mod}",
    waitSignal: "Attends le signal…",
    fire: "FEU !",
    earlyDraw: "TIR ANTICIPÉ !",
    earlyDrawSub: "Tu as dégainé avant le signal…",
    oppEarly: "TIR ANTICIPÉ ADVERSE",
    down: "À TERRE !",
    youFell: "TU ES TOMBÉ",
    missed: "Raté !",
    hitSub: "Touché !",
    hitArm: "Touché au bras !",
    youDodged: "Tu l'as esquivée !",
    dodgedSub: "Esquivé !",
    hatOff: "Tu lui as fait voler le chapeau !",
    hatLost: "Il t'a fait voler le chapeau !",
    oppPicks: "{name} choisit : {perk}",
    reloading: "RECHARGEMENT…",
    dodgeLabel: "ESQUIVE",
    hpLabel: "VIE",
    roundWon: "MANCHE GAGNÉE",
    roundLost: "MANCHE PERDUE",
    roundDraw: "MANCHE NULLE",
    reasonEarlyYou: "Tir anticipé. La manche revient à {name}.",
    reasonEarlyOpp: "{name} a dégainé avant le signal. La manche est pour toi.",
    reasonBothYou: "Les deux sont tombés, mais ta balle est partie la première.",
    reasonBothOpp: "Les deux sont tombés, la balle adverse est partie la première.",
    reasonBothNone: "Personne ne se relève. Manche nulle.",
    reasonOppDown: "Adversaire au tapis.",
    reasonYouDown: "Tu mords la poussière.",
    reasonNobody: "Personne n'est tombé. On remet ça.",
    yourShot: "Ton premier tir",
    oppShot: "Tir adverse",
    victory: "VICTOIRE !",
    defeat: "DÉFAITE…",
    victoryDetail: "La ville est à toi. {score}.",
    defeatDetail: "{name} repart au saloon. {score}.",
    bestReflex: " Meilleur réflexe : {ms} ms.",
    waitingTitle: "EN ATTENTE…",
    waitingRematch: "On attend que l'adversaire accepte la revanche.",
    fled: "FUITE !",
    fledDetail: "L'adversaire a quitté la ville. Victoire par forfait.",
    "mod.noon.name": "PLEIN SOLEIL",
    "mod.noon.desc": "Soleil de plomb. Ne le fixe pas, il aveugle.",
    "mod.dusk.name": "CRÉPUSCULE",
    "mod.dusk.desc": "La nuit tombe, on ne distingue que les silhouettes.",
    "mod.fog.name": "BRUME",
    "mod.fog.desc": "Un brouillard épais noie la rue.",
    "mod.wind.name": "RAFALES",
    "mod.wind.desc": "Le vent secoue les bras et fait valser la poussière.",
    "perk.hands.name": "Mains rapides",
    "perk.hands.desc": "Rechargement 40% plus rapide après un tir manqué.",
    "perk.step.name": "Pas de côté",
    "perk.step.desc": "Une esquive supplémentaire à chaque manche.",
    "perk.eye.name": "Œil d'aigle",
    "perk.eye.desc": "La visée pardonne : les tirs proches de la tête comptent.",
    "perk.vest.name": "Gilet renforcé",
    "perk.vest.desc": "Un point de vie supplémentaire.",
    "perk.calm.name": "Sang-froid",
    "perk.calm.desc": "Ton viseur flotte beaucoup moins.",
    "perk.draw.name": "Dégainé souple",
    "perk.draw.desc": "Le dégainé désaxe deux fois moins ta visée.",
    "perk.brim.name": "Chapeau baissé",
    "perk.brim.desc": "L'éblouissement du soleil ne t'atteint plus.",
    "perk.spurs.name": "Éperons",
    "perk.spurs.desc": "Tu peux ré-esquiver bien plus vite.",
    "persona.nervous.desc": "Dégaine très vite mais craque sous la pression. Tir anticipé fréquent.",
    "persona.rapido.desc": "Le plus rapide de l'Ouest. Vise la tête, rate parfois tout.",
    "persona.patient.desc": "Lent au signal, mais ne rate jamais une faute. Punit les esquives."
  }
};

let current = "en";
const stored = localStorage.getItem("hn-lang");
if (stored === "fr" || stored === "en") {
  current = stored;
}

export function getLang() {
  return current;
}

export function setLang(lang) {
  localStorage.setItem("hn-lang", lang);
  current = lang;
}

export function t(key, params) {
  let text = STRINGS[current][key];
  if (text === undefined) {
    text = key;
  }
  if (params) {
    for (const name of Object.keys(params)) {
      text = text.split("{" + name + "}").join(String(params[name]));
    }
  }
  return text;
}

export function applyStatic() {
  const nodes = document.querySelectorAll("[data-i18n]");
  for (const node of nodes) {
    node.textContent = t(node.getAttribute("data-i18n"));
  }
  const htmlNodes = document.querySelectorAll("[data-i18n-html]");
  for (const node of htmlNodes) {
    node.innerHTML = t(node.getAttribute("data-i18n-html"));
  }
  document.documentElement.lang = current;
}
