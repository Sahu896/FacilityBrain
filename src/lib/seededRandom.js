// Deterministic PRNG (mulberry32) so the dummy dataset looks the same
// across reloads instead of reshuffling every refresh.
function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeRng(seed = 42) {
  const rand = mulberry32(seed)
  return {
    next: () => rand(),
    range: (min, max) => min + rand() * (max - min),
    int: (min, max) => Math.floor(min + rand() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(rand() * arr.length)],
    bool: (p = 0.5) => rand() < p,
  }
}
