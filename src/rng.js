export function createRng(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed() {
  return Math.floor(Math.random() * 2147483647);
}

export function roundSeed(matchSeed, roundIndex) {
  return (matchSeed + roundIndex * 7919 + 13) >>> 0;
}

export function rangeFrom(rng, min, max) {
  return min + rng() * (max - min);
}
