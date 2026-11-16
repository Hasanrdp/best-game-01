// EMBERLINE — the game itself: state machine, waves, spawning, movement,
// collisions, scoring, combo, upgrades and the boss. Rendering lives in
// render.js; this file only decides what happens each tick.
import {
  VIEW_W, VIEW_H, PLAYER, ENEMIES, WAVES, UPGRADES, COMBO, PICKUPS, BEST_KEY,
} from './config.js';
import { makeRng } from './random.js';
import {
  makePlayer, makeEnemy, makeBullet, makePickup, makeParticle, makeFloatText,
  burst, clampToArena, dist2,
} from './entities.js';

export const STATES = {
  TITLE: 'title',
  PLAY: 'play',
  UPGRADE: 'upgrade',
  PAUSED: 'paused',
  OVER: 'over',
  WIN: 'win',
};

export class World {
  constructor(audio) {
    this.audio = audio;
    this.rng = makeRng((Date.now() % 2147483647) || 1);
    this.state = STATES.TITLE;
    this.stateBeforePause = STATES.PLAY;
    this.player = makePlayer(VIEW_W / 2, VIEW_H / 2);
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.pickups = [];
    this.particles = [];
    this.floats = [];
    this.embers = [];
    this.score = 0;
    this.kills = 0;
    this.wave = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.waveState = 'idle'; // idle | spawning | fighting | cleared
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveClearTimer = 0;
    this.upgradeChoices = [];
    this.shake = 0;
    this.time = 0;
    this.boss = null;
    this.bossWarn = 0;
    this.best = 0;
    try { this.best = Number(window.localStorage.getItem(BEST_KEY) || 0) || 0; } catch { this.best = 0; }
    this.demo = false;
    this.demoTimer = 0;
    this.novaFlash = 0;
    this._seedEmbers();
  }

  _seedEmbers() {
    for (let i = 0; i < 70; i++) {
      this.embers.push({
        x: this.rng.range(0, VIEW_W),
        y: this.rng.range(0, VIEW_H),
        r: this.rng.range(0.8, 2.6),
        speed: this.rng.range(6, 22),
        drift: this.rng.range(-8, 8),
        alpha: this.rng.range(0.15, 0.6),
      });
    }
  }

  startRun() {
    this.player = makePlayer(VIEW_W / 2, VIEW_H / 2);
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.pickups = [];
    this.particles = [];
    this.floats = [];
    this.score = 0;
    this.kills = 0;
    this.wave = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.boss = null;
    this.state = STATES.PLAY;
    this.demo = false;
    this.beginWave(1);
  }

  beginWave(n) {
    this.wave = n;
    this.waveState = 'spawning';
    this.spawnQueue = this._buildWave(n);
    this.spawnTimer = 0.6;
    if (n % WAVES.bossEvery === 0) {
      this.bossWarn = 2.2;
      this.audio.bossRoar();
    } else {
      this.audio.waveHorn();
    }
  }

  _buildWave(n) {
    const queue = [];
    let budget = WAVES.budget(n);
    const kinds = ['cinder'];
    if (n >= 2) kinds.push('spitter');
    if (n >= 3) kinds.push('splitter');
    if (n >= 4) kinds.push('brute');
    while (budget > 0) {
      const kind = this.rng.pick(kinds);
      const cost = ENEMIES[kind].cost;
      if (cost > budget && kind !== 'cinder') continue;
      queue.push(kind);
      budget -= cost;
      if (queue.length > 90) break;
    }
    if (n % WAVES.bossEvery === 0) queue.unshift('boss');
    // Shuffle everything except a leading boss.
    const head = queue[0] === 'boss' ? ['boss'] : [];
    const rest = head.length ? queue.slice(1) : queue;
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.next() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return head.concat(rest);
  }

  _spawnEdge(kind) {
    const side = this.rng.int(0, 3);
    let x;
    let y;
    if (side === 0) { x = this.rng.range(40, VIEW_W - 40); y = -30; }
    else if (side === 1) { x = VIEW_W + 30; y = this.rng.range(40, VIEW_H - 40); }
    else if (side === 2) { x = this.rng.range(40, VIEW_W - 40); y = VIEW_H + 30; }
    else { x = -30; y = this.rng.range(40, VIEW_H - 40); }
    const e = makeEnemy(kind, x, y, this.wave);
    this.enemies.push(e);
    if (kind === 'boss') this.boss = e;
    return e;
  }

  addScore(base, x, y) {
    const mult = 1 + Math.min(this.combo, COMBO.cap) * COMBO.step;
    const waveBonus = 1 + this.wave * 0.05;
    const gained = Math.round(base * mult * waveBonus);
    this.score += gained;
    if (x !== undefined) {
      this.floats.push(makeFloatText(x, y, `+${gained}`, mult > 1.5 ? '#ffd23c' : '#f4f1ff'));
    }
  }

  registerKill(e) {
    this.kills += 1;
    this.combo += 1;
    this.comboTimer = COMBO.window;
    this.addScore(e.score, e.x, e.y);
    burst(this.particles, e.x, e.y, e.kind === 'boss' ? 60 : 14, e.color, 260, 0.7, 5);
    burst(this.particles, e.x, e.y, 6, '#ffd23c', 160, 0.5, 3);
    this.audio.enemyDie();
    if (e.kind === 'splitter') {
      for (let i = 0; i < 2; i++) {
        const m = makeEnemy('mote', e.x + this.rng.range(-18, 18), e.y + this.rng.range(-18, 18), this.wave);
        this.enemies.push(m);
      }
    }
    if (e.kind === 'boss') {
      this.boss = null;
      this.shake = Math.max(this.shake, 16);
      this.novaFlash = 0.5;
      this.audio.nova();
      for (let i = 0; i < 3; i++) {
        this.pickups.push(makePickup('heal', e.x + this.rng.range(-60, 60), e.y + this.rng.range(-60, 60)));
      }
      if (this.wave >= WAVES.victoryWave) {
        this._win();
        return;
      }
    }
    const roll = this.rng.next();
    if (roll < PICKUPS.healChance) this.pickups.push(makePickup('heal', e.x, e.y));
    else if (roll < PICKUPS.healChance + PICKUPS.novaChance) this.pickups.push(makePickup('nova', e.x, e.y));
    else if (roll < PICKUPS.healChance + PICKUPS.novaChance + PICKUPS.magnetChance) this.pickups.push(makePickup('magnet', e.x, e.y));
  }

  fireNova() {
    this.novaFlash = 0.6;
    this.shake = Math.max(this.shake, 10);
    this.audio.nova();
    burst(this.particles, this.player.x, this.player.y, 50, '#38bdf8', 520, 0.8, 5);
    for (const e of this.enemies) {
      e.hp -= PICKUPS.novaDamage;
      e.hitFlash = 0.15;
      if (e.hp <= 0 && e.alive) {
        e.alive = false;
        this.registerKill(e);
      }
    }
    this.enemyBullets = [];
  }

  hurtPlayer(damage) {
    const p = this.player;
    if (!p.alive || p.invuln > 0 || p.dashTimeLeft > 0) return;
    p.hp -= damage;
    p.invuln = PLAYER.invulnTime;
    this.combo = 0;
    this.comboTimer = 0;
    this.shake = Math.max(this.shake, 12);
    burst(this.particles, p.x, p.y, 22, '#ff5d73', 300, 0.7, 5);
    this.audio.playerHurt();
    if (p.hp <= 0) {
      p.alive = false;
      burst(this.particles, p.x, p.y, 70, '#ffb347', 420, 1.1, 6);
      burst(this.particles, p.x, p.y, 40, '#ff6b2c', 300, 0.9, 5);
      this.audio.gameOver();
      this._gameOver();
    }
  }

  _gameOver() {
    this.state = STATES.OVER;
    this.waveState = 'idle';
    if (this.score > this.best) {
      this.best = this.score;
      try { window.localStorage.setItem(BEST_KEY, String(this.best)); } catch { /* storage unavailable */ }
    }
  }

  _win() {
    this.state = STATES.WIN;
    this.waveState = 'idle';
    if (this.score > this.best) {
      this.best = this.score;
      try { window.localStorage.setItem(BEST_KEY, String(this.best)); } catch { /* storage unavailable */ }
    }
    this.audio.victory();
  }

  offerUpgrades() {
    this.state = STATES.UPGRADE;
    this.waveState = 'cleared';
    this.upgradeChoices = this.rng.sample(UPGRADES, 3);
  }

  pickUpgrade(index) {
    const up = this.upgradeChoices[index];
    if (!up) return;
    up.apply(this.player);
    this.audio.upgradePick();
    this.floats.push(makeFloatText(this.player.x, this.player.y - 30, up.name, '#ffd23c'));
    this.upgradeChoices = [];
    this.state = STATES.PLAY;
    this.beginWave(this.wave + 1);
  }

  togglePause() {
    if (this.state === STATES.PLAY) {
      this.stateBeforePause = STATES.PLAY;
      this.state = STATES.PAUSED;
    } else if (this.state === STATES.PAUSED) {
      this.state = this.stateBeforePause;
    }
  }

  // ---- per-frame update -------------------------------------------------
  update(dt, input) {
    this.time += dt;
    this._updateEmbers(dt);
    this._updateParticles(dt);
    this._updateFloats(dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 34);
    if (this.novaFlash > 0) this.novaFlash = Math.max(0, this.novaFlash - dt * 1.6);
    if (this.bossWarn > 0) this.bossWarn = Math.max(0, this.bossWarn - dt);

    if (this.state === STATES.TITLE) {
      this._updateDemo(dt);
      return;
    }
    if (this.state !== STATES.PLAY) return;

    const p = this.player;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (p.invuln > 0) p.invuln -= dt;
    if (p.magnetTime > 0) p.magnetTime -= dt;

    // Demo autopilot (title screen background play).
    if (this.demo) this._demoDrive(dt, input);

    // --- player movement + dash ---
    const mv = input.moveVector();
    if (p.dashTimeLeft > 0) {
      p.dashTimeLeft -= dt;
      p.x += p.dashDirX * PLAYER.dashSpeed * dt;
      p.y += p.dashDirY * PLAYER.dashSpeed * dt;
      if (this.rng.next() < 0.7) {
        this.particles.push(makeParticle(p.x, p.y, 0, 0, 0.3, 5, '#ffb347'));
      }
    } else {
      p.x += mv.x * p.speed * dt;
      p.y += mv.y * p.speed * dt;
      if (p.dashTimer > 0) p.dashTimer -= dt;
      if ((input.wasPressed('ShiftLeft') || input.wasPressed('ShiftRight')) && p.dashTimer <= 0 && (mv.x !== 0 || mv.y !== 0)) {
        p.dashTimeLeft = PLAYER.dashTime;
        p.dashTimer = p.dashCooldown;
        p.dashDirX = mv.x;
        p.dashDirY = mv.y;
        this.audio.dash();
      }
    }
    clampToArena(p);

    // --- aim + fire ---
    const aimDx = input.mouseX - p.x;
    const aimDy = input.mouseY - p.y;
    if (aimDx !== 0 || aimDy !== 0) p.angle = Math.atan2(aimDy, aimDx);
    p.fireTimer -= dt;
    if (input.firing() && p.fireTimer <= 0 && p.alive) {
      p.fireTimer = p.fireInterval;
      const spread = 0.14;
      const n = p.shots;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * spread;
        const a = p.angle + off;
        this.bullets.push(makeBullet(
          p.x + Math.cos(a) * (p.radius + 6),
          p.y + Math.sin(a) * (p.radius + 6),
          Math.cos(a) * p.bulletSpeed,
          Math.sin(a) * p.bulletSpeed,
          p.bulletDamage,
          p.pierce,
          true,
        ));
      }
      this.audio.shoot();
    }

    // --- waves ---
    if (this.waveState === 'spawning') {
      this.spawnTimer -= dt;
      if (this.spawnQueue.length > 0 && this.spawnTimer <= 0) {
        this._spawnEdge(this.spawnQueue.shift());
        this.spawnTimer = WAVES.spawnInterval(this.wave);
      } else if (this.spawnQueue.length === 0) {
        this.waveState = 'fighting';
      }
    } else if (this.waveState === 'fighting' && this.enemies.length === 0) {
      this.waveClearTimer += dt;
      if (this.waveClearTimer > 0.9) {
        this.waveClearTimer = 0;
        this.offerUpgrades();
      }
    }

    this._updateEnemies(dt);
    this._updateBullets(dt);
    this._updatePickups(dt);
    this._collide();

    // Sweep dead entities.
    this.enemies = this.enemies.filter((e) => e.alive);
    this.bullets = this.bullets.filter((b) => b.alive);
    this.enemyBullets = this.enemyBullets.filter((b) => b.alive);
    this.pickups = this.pickups.filter((u) => u.alive);
  }

  _updateEmbers(dt) {
    for (const e of this.embers) {
      e.y -= e.speed * dt;
      e.x += e.drift * dt + Math.sin(this.time * 0.7 + e.r * 10) * 4 * dt;
      if (e.y < -4) {
        e.y = VIEW_H + 4;
        e.x = this.rng.range(0, VIEW_W);
      }
      if (e.x < -4) e.x = VIEW_W + 4;
      if (e.x > VIEW_W + 4) e.x = -4;
    }
  }

  _updateParticles(dt) {
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= pt.drag;
      pt.vy *= pt.drag;
      if (pt.life <= 0) pt.alive = false;
    }
    this.particles = this.particles.filter((pt) => pt.alive);
    if (this.particles.length > 420) this.particles.splice(0, this.particles.length - 420);
  }

  _updateFloats(dt) {
    for (const f of this.floats) {
      f.life -= dt;
      f.y -= 42 * dt;
      if (f.life <= 0) f.alive = false;
    }
    this.floats = this.floats.filter((f) => f.alive);
  }

  _updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.hitFlash > 0) e.hitFlash -= dt;
      e.wobble += dt * 2;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d;
      const ny = dy / d;
      if (e.kind === 'cinder' || e.kind === 'mote' || e.kind === 'brute') {
        const wob = e.kind === 'cinder' ? Math.sin(e.wobble) * 0.35 : 0;
        const px = -ny * wob;
        const py = nx * wob;
        e.x += (nx + px) * e.speed * dt;
        e.y += (ny + py) * e.speed * dt;
        e.angle = Math.atan2(dy, dx);
      } else if (e.kind === 'splitter') {
        e.x += nx * e.speed * dt;
        e.y += ny * e.speed * dt;
        e.angle = Math.atan2(dy, dx);
      } else if (e.kind === 'spitter') {
        if (d > 300) {
          e.x += nx * e.speed * dt;
          e.y += ny * e.speed * dt;
        } else if (d < 210) {
          e.x -= nx * e.speed * 0.7 * dt;
          e.y -= ny * e.speed * 0.7 * dt;
        } else {
          e.x += -ny * Math.sin(e.wobble * 0.5) * 30 * dt;
          e.y += nx * Math.sin(e.wobble * 0.5) * 30 * dt;
        }
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && p.alive) {
          e.shootTimer = 2.4 + this.rng.next() * 0.8;
          this.enemyBullets.push(makeBullet(e.x, e.y, nx * 185, ny * 185, 1, 0, false));
          burst(this.particles, e.x, e.y, 4, '#c77dff', 90, 0.3, 3);
        }
        e.angle = Math.atan2(dy, dx);
      } else if (e.kind === 'boss') {
        this._updateBoss(e, dt, nx, ny, d);
      }
      // Enemies drift in from off-screen without clamping; clamp once inside.
      if (e.x > -40 && e.x < VIEW_W + 40 && e.y > -40 && e.y < VIEW_H + 40) {
        e.x = Math.max(e.radius - 6, Math.min(VIEW_W - e.radius + 6, e.x));
        e.y = Math.max(e.radius - 6, Math.min(VIEW_H - e.radius + 6, e.y));
      }
    }
  }

  _updateBoss(e, dt, nx, ny, d) {
    e.burstTimer -= dt;
    e.chargeTimer -= dt;
    if (e.charging > 0) {
      e.charging -= dt;
      e.x += nx * 340 * dt;
      e.y += ny * 340 * dt;
      if (this.rng.next() < 0.8) {
        this.particles.push(makeParticle(e.x, e.y, 0, 0, 0.35, 7, '#ffc300'));
      }
      if (e.charging <= 0) {
        this.shake = Math.max(this.shake, 8);
        this.audio.enemyDie();
      }
      return;
    }
    e.x += nx * e.speed * dt;
    e.y += ny * e.speed * dt;
    e.angle = Math.atan2(ny, nx);
    if (e.burstTimer <= 0) {
      e.burstTimer = 2.6;
      const count = 10;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + e.angle;
        this.enemyBullets.push(makeBullet(e.x, e.y, Math.cos(a) * 150, Math.sin(a) * 150, 1, 0, false));
      }
      this.audio.enemyHit();
    }
    if (e.chargeTimer <= 0 && d > 220) {
      e.chargeTimer = 5.5;
      e.charging = 0.55;
      this.audio.bossRoar();
    }
  }

  _updateBullets(dt) {
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > VIEW_W + 20 || b.y < -20 || b.y > VIEW_H + 20) b.alive = false;
    }
    for (const b of this.enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > VIEW_W + 20 || b.y < -20 || b.y > VIEW_H + 20) b.alive = false;
    }
  }

  _updatePickups(dt) {
    const p = this.player;
    for (const u of this.pickups) {
      u.bob += dt * 3;
      u.life -= dt;
      if (u.life <= 0) { u.alive = false; continue; }
      const dx = p.x - u.x;
      const dy = p.y - u.y;
      const d = Math.hypot(dx, dy) || 1;
      const attract = p.magnetTime > 0 ? p.pickupRadius * 3.2 : p.pickupRadius;
      if (d < attract && p.alive) {
        const pull = 320 * (1 - d / (attract + 1));
        u.x += (dx / d) * pull * dt;
        u.y += (dy / d) * pull * dt;
      }
    }
  }

  _collide() {
    const p = this.player;
    // Player bullets vs enemies.
    for (const b of this.bullets) {
      if (!b.alive) continue;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const rr = b.radius + e.radius;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          e.hp -= b.damage;
          e.hitFlash = 0.09;
          burst(this.particles, b.x, b.y, 4, '#ffe66d', 140, 0.3, 3);
          this.audio.enemyHit();
          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            b.alive = false;
          }
          if (e.hp <= 0) {
            e.alive = false;
            this.registerKill(e);
          }
          if (!b.alive) break;
        }
      }
    }
    // Enemy bullets vs player.
    if (p.alive) {
      for (const b of this.enemyBullets) {
        if (!b.alive) continue;
        const rr = b.radius + p.radius - 3;
        if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
          b.alive = false;
          this.hurtPlayer(1);
        }
      }
      // Enemies touching the player.
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const rr = e.radius + p.radius - 2;
        if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
          this.hurtPlayer(e.damage);
          // Shove the enemy back so one touch is not a chain of hits.
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          e.x += (dx / d) * 26;
          e.y += (dy / d) * 26;
        }
      }
      // Pickups.
      for (const u of this.pickups) {
        if (!u.alive) continue;
        const rr = u.radius + p.radius + 6;
        if (dist2(u.x, u.y, p.x, p.y) < rr * rr) {
          u.alive = false;
          if (u.kind === 'heal') {
            p.hp = Math.min(p.maxHp, p.hp + 1);
            this.audio.heal();
            this.floats.push(makeFloatText(p.x, p.y - 26, '+1 HP', '#4ade80'));
          } else if (u.kind === 'nova') {
            this.fireNova();
          } else if (u.kind === 'magnet') {
            p.magnetTime = PICKUPS.magnetTime;
            this.audio.pickup();
            this.floats.push(makeFloatText(p.x, p.y - 26, 'MAGNET', '#f472b6'));
          }
        }
      }
    }
  }

  // ---- title-screen demo -----------------------------------------------
  _updateDemo(dt) {
    this.demoTimer -= dt;
    const p = this.player;
    // Keep a little skirmish alive behind the title.
    if (this.enemies.length < 7 && this.demoTimer <= 0) {
      this.demoTimer = 0.8;
      const kind = this.rng.pick(['cinder', 'cinder', 'spitter', 'splitter']);
      this._spawnEdge(kind);
    }
    // Demo player: drift toward the centre, fire at the nearest enemy.
    const target = this._nearestEnemy();
    if (target) {
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      p.angle = Math.atan2(dy, dx);
      p.x += (dx / d) * p.speed * 0.45 * dt;
      p.y += (dy / d) * p.speed * 0.45 * dt;
      clampToArena(p);
      p.fireTimer -= dt;
      if (p.fireTimer <= 0) {
        p.fireTimer = p.fireInterval * 1.6;
        this.bullets.push(makeBullet(
          p.x + Math.cos(p.angle) * (p.radius + 6),
          p.y + Math.sin(p.angle) * (p.radius + 6),
          Math.cos(p.angle) * p.bulletSpeed,
          Math.sin(p.angle) * p.bulletSpeed,
          1, 0, true,
        ));
      }
    }
    this._updateEnemies(dt);
    this._updateBullets(dt);
    for (const b of this.bullets) {
      if (!b.alive) continue;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const rr = b.radius + e.radius;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          b.alive = false;
          e.hp -= 1;
          e.hitFlash = 0.09;
          burst(this.particles, b.x, b.y, 4, '#ffe66d', 140, 0.3, 3);
          if (e.hp <= 0) {
            e.alive = false;
            burst(this.particles, e.x, e.y, 14, e.color, 260, 0.7, 5);
          }
          break;
        }
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive);
    this.bullets = this.bullets.filter((b) => b.alive);
  }

  _nearestEnemy() {
    let best = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      const d = dist2(e.x, e.y, this.player.x, this.player.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  _demoDrive() {
    // Reserved for a future autopilot; the title demo drives itself.
  }
}
