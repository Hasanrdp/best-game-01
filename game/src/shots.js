// EMBERLINE — deterministic screenshot states for ?shot= queries.
// One clear job: build a fixed, good-looking frame for each screenshot the
// maker takes (title, mid-combat, upgrade choice, game over). The game is
// frozen in these states so a screenshot is reproducible.
import { VIEW_W, VIEW_H } from './config.js';
import { makeRng } from './random.js';
import { makeEnemy, makeBullet, burst } from './entities.js';
import { STATES } from './world.js';

// A small fixed roster staged around the player for the combat shot.
function stageCombat(world) {
  const rng = makeRng(1337);
  world.state = STATES.PLAY;
  world.wave = 3;
  world.score = 2450;
  world.kills = 41;
  world.combo = 12;
  world.comboTimer = 2.2;
  world.player.x = 560;
  world.player.y = 380;
  world.player.angle = -0.4;
  world.player.hp = 2;
  world.player.maxHp = 4;
  world.player.dashTimer = 0.8;
  const spots = [
    ['cinder', 760, 250], ['cinder', 840, 420], ['cinder', 420, 220],
    ['spitter', 920, 300], ['spitter', 380, 520],
    ['splitter', 700, 540], ['splitter', 980, 520],
    ['brute', 880, 180], ['mote', 620, 300], ['mote', 660, 470],
  ];
  for (const [kind, x, y] of spots) {
    const e = makeEnemy(kind, x, y, 3);
    e.hp = kind === 'brute' ? 7 : e.hp;
    world.enemies.push(e);
  }
  for (let i = 0; i < 5; i++) {
    const a = -0.4 + (i - 2) * 0.14;
    world.bullets.push(makeBullet(
      560 + Math.cos(a) * 30, 380 + Math.sin(a) * 30,
      Math.cos(a) * 640, Math.sin(a) * 640, 1, 0, true,
    ));
  }
  world.enemyBullets.push(makeBullet(900, 300, -150, 60, 1, 0, false));
  world.enemyBullets.push(makeBullet(380, 520, 120, -80, 1, 0, false));
  burst(world.particles, 760, 250, 12, '#ff4d4d', 220, 0.6, 5);
  burst(world.particles, 880, 180, 10, '#ff2e88', 180, 0.6, 5);
  burst(world.particles, 560, 380, 8, '#ffe66d', 160, 0.5, 4);
  world.pickups.push({ id: 9001, kind: 'heal', x: 480, y: 300, radius: 12, vx: 0, vy: 0, bob: 0.5, alive: true, life: 12 });
  world.pickups.push({ id: 9002, kind: 'nova', x: 1000, y: 420, radius: 12, vx: 0, vy: 0, bob: 1.2, alive: true, life: 12 });
  void rng;
}

function stageUpgrade(world) {
  world.state = STATES.UPGRADE;
  world.wave = 4;
  world.score = 3120;
  world.kills = 58;
  world.player.hp = 3;
  world.player.maxHp = 4;
  world.upgradeChoices = world.rng.sample(
    [
      { id: 'rapid', name: 'Rapid Chamber', desc: '+18% fire rate', apply: () => {} },
      { id: 'twin', name: 'Twin Lance', desc: '+1 projectile', apply: () => {} },
      { id: 'heart', name: 'Ember Heart', desc: '+1 max HP, heal 1', apply: () => {} },
    ],
    3,
  );
  const rng = makeRng(77);
  for (let i = 0; i < 14; i++) {
    burst(world.particles, rng.range(200, 1080), rng.range(120, 600), 3, '#ffd23c', 60, 0.8, 3);
  }
}

function stageGameOver(world) {
  world.state = STATES.OVER;
  world.wave = 6;
  world.score = 5840;
  world.kills = 96;
  world.best = 5840;
  world.player.alive = false;
  world.player.hp = 0;
  burst(world.particles, 640, 360, 60, '#ffb347', 320, 1.0, 6);
  burst(world.particles, 640, 360, 30, '#ff5d73', 240, 0.9, 5);
}

function stageWin(world) {
  world.state = STATES.WIN;
  world.wave = 10;
  world.score = 12480;
  world.kills = 210;
  world.best = 12480;
  world.player.hp = 2;
  world.player.maxHp = 5;
  burst(world.particles, 640, 300, 50, '#ffd23c', 260, 1.0, 5);
  burst(world.particles, 640, 300, 30, '#ff9a3c', 200, 0.9, 4);
}

// Apply a ?shot= state. Returns true when a shot state was applied.
export function applyShot(world, name) {
  if (name === 'start') {
    world.state = STATES.TITLE;
    world.demo = true;
    return true;
  }
  if (name === 'play') { stageCombat(world); return true; }
  if (name === 'upgrade') { stageUpgrade(world); return true; }
  if (name === 'end') { stageGameOver(world); return true; }
  if (name === 'win') { stageWin(world); return true; }
  return false;
}
