// EMBERLINE — everything the player sees: the arena, the entities, the HUD
// and every menu screen. One clear job: draw the world state, decide nothing.
import { VIEW_W, VIEW_H, PALETTE, ENEMIES } from './config.js';
import { STATES } from './world.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  render(world, input) {
    const ctx = this.ctx;
    ctx.save();
    if (world.shake > 0.2) {
      const s = world.shake;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    this._drawBackground(world);
    this._drawPickups(world);
    this._drawEnemies(world);
    this._drawBullets(world);
    this._drawPlayer(world);
    this._drawParticles(world);
    this._drawFloats(world);
    ctx.restore();
    if (world.novaFlash > 0) {
      ctx.fillStyle = `rgba(180, 220, 255, ${(world.novaFlash * 0.35).toFixed(3)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (world.state === STATES.PLAY || world.state === STATES.PAUSED || world.state === STATES.UPGRADE) {
      this._drawHud(world);
    }
    if (world.bossWarn > 0 && world.state === STATES.PLAY) this._drawBossWarn(world);
    if (world.state === STATES.TITLE) this._drawTitle(world);
    if (world.state === STATES.UPGRADE) this._drawUpgrades(world, input);
    if (world.state === STATES.PAUSED) this._drawPause(world);
    if (world.state === STATES.OVER) this._drawGameOver(world);
    if (world.state === STATES.WIN) this._drawWin(world);
  }

  _drawBackground(world) {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(640, 330, 60, 640, 360, 760);
    g.addColorStop(0, PALETTE.bg1);
    g.addColorStop(1, PALETTE.bg0);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Faint grid.
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 40; x < VIEW_W; x += 80) { ctx.moveTo(x, 0); ctx.lineTo(x, VIEW_H); }
    for (let y = 40; y < VIEW_H; y += 80) { ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); }
    ctx.stroke();
    // Drifting embers.
    for (const e of world.embers) {
      ctx.globalAlpha = e.alpha;
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Vignette.
    const v = ctx.createRadialGradient(640, 360, 300, 640, 360, 780);
    v.addColorStop(0, 'rgba(4,6,16,0)');
    v.addColorStop(1, PALETTE.vignette);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  _drawPickups(world) {
    const ctx = this.ctx;
    for (const u of world.pickups) {
      const bobY = Math.sin(u.bob) * 3;
      const color = u.kind === 'heal' ? PALETTE.pickupHeal : u.kind === 'nova' ? PALETTE.pickupNova : PALETTE.pickupMagnet;
      ctx.save();
      ctx.translate(u.x, u.y + bobY);
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0a0e1e';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(u.kind === 'heal' ? '+' : u.kind === 'nova' ? '✦' : '◎', 0, 1);
      ctx.restore();
      if (u.life < 3) {
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(world.time * 6));
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(u.x, u.y + bobY, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  _drawEnemies(world) {
    const ctx = this.ctx;
    for (const e of world.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      const flash = e.hitFlash > 0;
      const color = flash ? '#ffffff' : e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = e.kind === 'boss' ? 30 : 14;
      if (e.kind === 'cinder') {
        this._spiky(ctx, 0, 0, e.radius, 8, color);
      } else if (e.kind === 'spitter') {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0e1e';
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(Math.cos(e.angle) * e.radius * 0.55, Math.sin(e.angle) * e.radius * 0.55, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === 'splitter') {
        ctx.rotate(Math.sin(e.wobble) * 0.3);
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, e.radius, a, a + Math.PI * 2 / 3);
        }
        ctx.fill();
        ctx.fillStyle = '#0a0e1e';
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === 'mote') {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === 'brute') {
        ctx.rotate(e.angle);
        ctx.fillStyle = color;
        this._hex(ctx, 0, 0, e.radius);
        ctx.fill();
        ctx.fillStyle = 'rgba(10,14,30,0.55)';
        this._hex(ctx, 0, 0, e.radius * 0.55);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(e.radius * 0.45, 0, 4, 0, Math.PI * 2);
        ctx.arc(-e.radius * 0.45, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === 'boss') {
        ctx.rotate(e.angle * 0.25);
        this._spiky(ctx, 0, 0, e.radius, 12, color);
        ctx.rotate(-e.angle * 0.25);
        ctx.fillStyle = '#0a0e1e';
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff3d6';
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // HP bar for tough enemies.
      if ((e.kind === 'brute' || e.kind === 'boss') && e.hp < e.maxHp) {
        const w = e.radius * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 5);
        ctx.fillStyle = e.kind === 'boss' ? '#ffc300' : '#ff5d73';
        ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * (e.hp / e.maxHp), 5);
      }
    }
  }

  _spiky(ctx, x, y, r, points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rr = i % 2 === 0 ? r : r * 0.62;
      const a = (i / (points * 2)) * Math.PI * 2;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  _hex(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  _drawBullets(world) {
    const ctx = this.ctx;
    for (const b of world.bullets) {
      ctx.save();
      ctx.shadowColor = '#ffe66d';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffe66d';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fffbe0';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const b of world.enemyBullets) {
      ctx.save();
      ctx.shadowColor = '#ff7bff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ff7bff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawPlayer(world) {
    const ctx = this.ctx;
    const p = world.player;
    if (!p.alive) return;
    if (p.invuln > 0 && Math.floor(world.time * 14) % 2 === 0) return; // blink while invulnerable
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.dashTimeLeft > 0) {
      ctx.globalAlpha = 0.55;
    }
    ctx.shadowColor = PALETTE.ember;
    ctx.shadowBlur = 22;
    ctx.rotate(p.angle);
    // Flame lance: a teardrop hull with a bright core.
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, 11);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, -11);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.playerCore;
    ctx.beginPath();
    ctx.arc(2, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Dash cooldown ring.
    if (p.dashTimer > 0) {
      const frac = 1 - p.dashTimer / p.dashCooldown;
      ctx.strokeStyle = 'rgba(255, 179, 71, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
    }
    // Magnet aura.
    if (p.magnetTime > 0) {
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.pickupRadius * 3.2 * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawParticles(world) {
    const ctx = this.ctx;
    for (const pt of world.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawFloats(world) {
    const ctx = this.ctx;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of world.floats) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  _drawHud(world) {
    const ctx = this.ctx;
    const p = world.player;
    // Top bar panel.
    ctx.fillStyle = 'rgba(8, 11, 26, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, 64);
    ctx.fillStyle = 'rgba(255, 154, 60, 0.35)';
    ctx.fillRect(0, 64, VIEW_W, 2);
    // Score.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('SCORE', 24, 24);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText(String(world.score).padStart(6, '0'), 24, 52);
    // Combo.
    if (world.combo > 1) {
      const mult = (1 + Math.min(world.combo, 50) * 0.05).toFixed(2);
      ctx.fillStyle = '#ffd23c';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(`COMBO x${world.combo}  (${mult}x)`, 210, 48);
      const frac = world.comboTimer / 3;
      ctx.fillStyle = 'rgba(255, 210, 60, 0.3)';
      ctx.fillRect(210, 54, 120, 4);
      ctx.fillStyle = '#ffd23c';
      ctx.fillRect(210, 54, 120 * frac, 4);
    }
    // Wave.
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('WAVE', 640, 24);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText(String(world.wave), 640, 52);
    // Hearts.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('EMBER', 1256, 24);
    for (let i = 0; i < p.maxHp; i++) {
      const x = 1256 - i * 30;
      ctx.fillStyle = i < p.hp ? PALETTE.hp : PALETTE.hpEmpty;
      this._heart(ctx, x - 12, 42, 10);
    }
    // Best score.
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`BEST ${world.best}`, 1256, 92);
    // Boss bar.
    if (world.boss && world.boss.alive) {
      const b = world.boss;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffc300';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('ASH TITAN', 640, 92);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(440, 100, 400, 10);
      ctx.fillStyle = '#ffc300';
      ctx.fillRect(440, 100, 400 * Math.max(0, b.hp / b.maxHp), 10);
    }
    // Dash hint.
    if (world.state === STATES.PLAY && world.wave === 1 && world.time < 14) {
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('WASD move · Mouse aim · Hold Click / Space to fire · Shift to dash · P pause · M mute', 640, 700);
    }
  }

  _heart(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.9);
    ctx.bezierCurveTo(-s * 1.2, 0, -s * 0.6, -s, 0, -s * 0.35);
    ctx.bezierCurveTo(s * 0.6, -s, s * 1.2, 0, 0, s * 0.9);
    ctx.fill();
    ctx.restore();
  }

  _drawBossWarn(world) {
    const ctx = this.ctx;
    const blink = Math.floor(world.time * 6) % 2 === 0;
    if (!blink) return;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffc300';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.shadowColor = '#ffc300';
    ctx.shadowBlur = 18;
    ctx.fillText('⚠ ASH TITAN APPROACHES ⚠', 640, 150);
    ctx.shadowBlur = 0;
  }

  _panel(ctx, x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  _drawTitle(world) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6, 8, 20, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff6b2c';
    ctx.shadowBlur = 34;
    ctx.fillStyle = '#ffd23c';
    ctx.font = '900 96px system-ui, sans-serif';
    ctx.fillText('EMBERLINE', 640, 250);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.ember;
    ctx.font = '600 24px system-ui, sans-serif';
    ctx.fillText('— The Last Ember Warden —', 640, 296);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Ash creatures swarm the dying flame. Hold the line, wave after wave.', 640, 340);
    ctx.fillText('Slay the Ash Titan every 5 waves. Survive wave 10 and the ember holds.', 640, 368);
    const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('CLICK OR PRESS ENTER TO PLAY', 640, 440);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('WASD / Arrows — move      Mouse — aim      Hold Click / Space — fire      Shift — dash', 640, 500);
    ctx.fillText('P — pause      M — mute      R — restart      Between waves: pick 1 of 3 upgrades (keys 1-3)', 640, 526);
    if (world.best > 0) {
      ctx.fillStyle = '#ffd23c';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(`BEST SCORE  ${world.best}`, 640, 580);
    }
  }

  _drawUpgrades(world, input) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6, 8, 20, 0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.fillText(`WAVE ${world.wave} CLEARED`, 640, 130);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Choose an upgrade — click a card or press 1, 2 or 3', 640, 168);
    const cards = world.upgradeChoices;
    const cw = 300;
    const ch = 190;
    const gap = 28;
    const total = cards.length * cw + (cards.length - 1) * gap;
    let x = 640 - total / 2;
    const y = 230;
    cards.forEach((up, i) => {
      const hover = input && input.mouseX >= x && input.mouseX <= x + cw && input.mouseY >= y && input.mouseY <= y + ch;
      ctx.save();
      if (hover) {
        ctx.translate(0, -8);
        ctx.shadowColor = '#ff9a3c';
        ctx.shadowBlur = 24;
      }
      this._panel(ctx, x, y, cw, ch);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffd23c';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(`[ ${i + 1} ]`, x + cw / 2, y + 40);
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 23px system-ui, sans-serif';
      this._wrapText(ctx, up.name, x + cw / 2, y + 84, cw - 36, 26);
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '17px system-ui, sans-serif';
      this._wrapText(ctx, up.desc, x + cw / 2, y + 132, cw - 36, 22);
      ctx.restore();
      x += cw + gap;
    });
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`Score ${world.score} · Wave ${world.wave} · Kills ${world.kills}`, 640, 480);
  }

  _wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
  }

  _drawPause(world) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6, 8, 20, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.fillText('PAUSED', 640, 300);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('WASD move · Mouse aim · Hold Click / Space fire · Shift dash · R restart · M mute', 640, 350);
    ctx.fillText('Press P or click to resume', 640, 384);
  }

  _drawGameOver(world) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(10, 4, 8, 0.66)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff2e55';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#ff5d73';
    ctx.font = '900 72px system-ui, sans-serif';
    ctx.fillText('THE EMBER DIES', 640, 250);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.text;
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(`The ash takes the last light on wave ${world.wave}.`, 640, 306);
    this._statsBlock(world, 360);
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', 640, 540);
  }

  _drawWin(world) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6, 12, 8, 0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffd23c';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#ffd23c';
    ctx.font = '900 72px system-ui, sans-serif';
    ctx.fillText('THE EMBER HOLDS', 640, 250);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.text;
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('Wave 10 falls. The Ash Titan is unmade — the flame burns on.', 640, 306);
    this._statsBlock(world, 360);
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('C — CONTINUE ENDLESS      R — PLAY AGAIN', 640, 540);
  }

  _statsBlock(world, y) {
    const ctx = this.ctx;
    const rows = [
      ['SCORE', String(world.score)],
      ['WAVE REACHED', String(world.wave)],
      ['CREATURES SLAIN', String(world.kills)],
      ['BEST SCORE', String(world.best)],
    ];
    ctx.font = '20px system-ui, sans-serif';
    rows.forEach(([label, value], i) => {
      const rowY = y + i * 38;
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.textDim;
      ctx.fillText(label, 600, rowY);
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.text;
      ctx.fillText(value, 680, rowY);
    });
  }
}
