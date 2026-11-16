// EMBERLINE — deterministic seeded random numbers.
// One clear job: every random choice in the game flows through here, so a
// fixed seed replays the exact same run (used by the screenshot states).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // Pick n distinct items from a list without mutating it.
    sample(list, n) {
      const copy = list.slice();
      const out = [];
      while (copy.length > 0 && out.length < n) {
        out.push(copy.splice(Math.floor(next() * copy.length), 1)[0]);
      }
      return out;
    },
    chance(p) {
      return next() < p;
    },
  };
}
