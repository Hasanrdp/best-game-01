// EMBERLINE — the moving things: player, enemies, bullets, pickups and
// particles. One clear job: each entity's shape, motion and health; the
// world file owns spawning, collisions and scoring, render.js owns drawing.
import { ENEMIES, PLAYER, VIEW_W, VIEW_H } from './config.js';

let nextId = 1;

export function makePlayer(x, y) {
  return {
    id: nextId++,
    kind: 'player',
    x, y,
    vx: 0, vy: 0,
    radius: PLAYER.radius,
    angle: -Math.PI / 2,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    speed: PLAYER.speed,
    fireInterval: PLAYER.fireInterval,
    fireTimer: 0,
    bulletSpeed: PLAYER.bulletSpeed,
    bulletDamage: PLAYER.bulletDamage,
    shots: 1,
    pierce: 0,
    dashCooldown: PLAYER.dashCooldown,
    dashTimer: 0,
    dashTimeLeft: 0,
    dashDirX: 1, dashDirY: 0,
    pickupRadius: PLAYER.pickupRadius,
    invuln: 0,
    magnetTime: 0,
    alive: true,
  };
}

export function makeEnemy(kind, x, y, wave) {
  const def = ENEMIES[kind];
  const hpScale = 1 + Math.max(0, wave - 1) * 0.06;
  const speedScale = 1 + Math.min(0.35, Math.max(0, wave - 1) * 0.015);
  const e = {
    id: nextId++,
    kind,
    x, y,
    vx: 0, vy: 0,
    radius: def.radius,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    speed: def.speed * speedScale,
    score: def.score,
    damage: def.damage,
    color: def.color,
    angle: 0,
    hitFlash: 0,
    shootTimer: 1 + Math.random() * 2,
    burstTimer: 0,
    chargeTimer: 4,
    charging: 0,
    wobble: Math.random() * Math.PI * 2,
    alive: true,
  };
  if (kind === 'boss') {
    e.hp = Math.round((ENEMIES.boss.hp + (wave - 5) * 22) * (1 + (wave - 5) * 0.08));
    e.maxHp = e.hp;
  }
  return e;
}

export function makeBullet(x, y, vx, vy, damage, pierce, friendly) {
  return {
    id: nextId++,
    x, y, vx, vy,
    radius: friendly ? PLAYER.bulletRadius : 6,
    damage,
    pierce,
    friendly,
    alive: true,
    life: 1.6,
  };
}

export function makePickup(kind, x, y) {
  return {
    id: nextId++,
    kind, // 'heal' | 'nova' | 'magnet'
    x, y,
    radius: 12,
    vx: 0, vy: 0,
    bob: Math.random() * Math.PI * 2,
    alive: true,
    life: 12,
  };
}

export function makeParticle(x, y, vx, vy, life, size, color, drag = 0.92) {
  return { x, y, vx, vy, life, maxLife: life, size, color, drag, alive: true };
}

export function makeFloatText(x, y, text, color) {
  return { x, y, text, color, life: 0.9, maxLife: 0.9, alive: true };
}

export function burst(particles, x, y, count, color, speed, life = 0.6, size = 4) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.7);
    particles.push(makeParticle(
      x, y,
      Math.cos(a) * s, Math.sin(a) * s,
      life * (0.5 + Math.random() * 0.5),
      size * (0.6 + Math.random() * 0.8),
      color,
    ));
  }
}

// Keep an entity inside the arena, bouncing softly off the walls.
export function clampToArena(e, margin = 0) {
  e.x = Math.max(e.radius + margin, Math.min(VIEW_W - e.radius - margin, e.x));
  e.y = Math.max(e.radius + margin, Math.min(VIEW_H - e.radius - margin, e.y));
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
