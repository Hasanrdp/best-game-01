// EMBERLINE — tuning, palette and shared constants.
// One clear job: every number the game balances on lives here, so tuning
// never means hunting through logic files.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const FIXED_DT = 1 / 60;

export const PALETTE = {
  bg0: '#0a0e1e',
  bg1: '#101735',
  grid: 'rgba(120, 140, 255, 0.07)',
  vignette: 'rgba(4, 6, 16, 0.55)',
  ember: '#ff9a3c',
  emberHot: '#ffd23c',
  flame: '#ff6b2c',
  player: '#ffb347',
  playerCore: '#fff3d6',
  hp: '#ff5d73',
  hpEmpty: 'rgba(255, 93, 115, 0.22)',
  cinder: '#ff4d4d',
  spitter: '#c77dff',
  splitter: '#2ec4b6',
  mote: '#7bf1d8',
  brute: '#ff2e88',
  boss: '#ffc300',
  bullet: '#ffe66d',
  enemyBullet: '#ff7bff',
  pickupHeal: '#4ade80',
  pickupNova: '#38bdf8',
  pickupMagnet: '#f472b6',
  text: '#f4f1ff',
  textDim: '#9aa3c7',
  gold: '#ffd23c',
  panel: 'rgba(10, 14, 30, 0.82)',
  panelEdge: 'rgba(255, 154, 60, 0.45)',
};

export const PLAYER = {
  radius: 14,
  speed: 265,
  maxHp: 3,
  maxHpCap: 6,
  fireInterval: 0.125,
  bulletSpeed: 640,
  bulletRadius: 5,
  bulletDamage: 1,
  dashSpeed: 920,
  dashTime: 0.14,
  dashCooldown: 2.1,
  pickupRadius: 64,
  invulnTime: 1.0,
};

// Enemy kinds: cost is the wave-budget price, score is the base award.
export const ENEMIES = {
  cinder: { radius: 13, hp: 2, speed: 96, score: 50, cost: 1, damage: 1, color: PALETTE.cinder },
  spitter: { radius: 14, hp: 3, speed: 58, score: 100, cost: 2, damage: 1, color: PALETTE.spitter },
  splitter: { radius: 16, hp: 3, speed: 86, score: 120, cost: 2, damage: 1, color: PALETTE.splitter },
  mote: { radius: 8, hp: 1, speed: 158, score: 25, cost: 0, damage: 1, color: PALETTE.mote },
  brute: { radius: 25, hp: 13, speed: 46, score: 300, cost: 4, damage: 1, color: PALETTE.brute },
  boss: { radius: 48, hp: 130, speed: 40, score: 2000, cost: 0, damage: 1, color: PALETTE.boss },
};

export const WAVES = {
  // Spawn budget in points per wave; composition unlocks as waves rise.
  budget: (wave) => 6 + wave * 4,
  spawnInterval: (wave) => Math.max(0.28, 0.95 - wave * 0.05),
  bossEvery: 5,
  victoryWave: 10,
};

export const UPGRADES = [
  { id: 'rapid', name: 'Rapid Chamber', desc: '+18% fire rate', apply: (p) => { p.fireInterval *= 0.82; } },
  { id: 'twin', name: 'Twin Lance', desc: '+1 projectile', apply: (p) => { p.shots += 1; } },
  { id: 'heavy', name: 'Heavy Rounds', desc: '+1 bullet damage', apply: (p) => { p.bulletDamage += 1; } },
  { id: 'swift', name: 'Swift Boots', desc: '+12% move speed', apply: (p) => { p.speed *= 1.12; } },
  { id: 'capacitor', name: 'Dash Capacitor', desc: '-30% dash cooldown', apply: (p) => { p.dashCooldown *= 0.7; } },
  { id: 'heart', name: 'Ember Heart', desc: '+1 max HP, heal 1', apply: (p) => { p.maxHp = Math.min(PLAYER.maxHpCap, p.maxHp + 1); p.hp = Math.min(p.maxHp, p.hp + 1); } },
  { id: 'magnet', name: 'Magnet Coil', desc: '+45% pickup radius', apply: (p) => { p.pickupRadius *= 1.45; } },
  { id: 'pierce', name: 'Piercing Rounds', desc: 'Bullets pierce +1 enemy', apply: (p) => { p.pierce += 1; } },
];

export const COMBO = {
  window: 3.0,
  step: 0.05,
  cap: 50,
  maxMult: 3.5,
};

export const PICKUPS = {
  healChance: 0.10,
  novaChance: 0.05,
  magnetChance: 0.07,
  magnetTime: 6,
  novaDamage: 4,
};

export const BEST_KEY = 'emberline.best.score.v1';
