// EMBERLINE — boot and the frame loop.
// One clear job: own the canvas, the fixed-timestep loop, and every
// screen transition (title -> play -> upgrade -> pause -> over / win).
import { VIEW_W, VIEW_H, FIXED_DT } from './config.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { World, STATES } from './world.js';
import { Renderer } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const audio = new AudioEngine();
const world = new World(audio);
const renderer = new Renderer(canvas);

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// Screenshot states (?shot=start|play|upgrade|end|win) freeze the game so a
// screenshot is reproducible. The loop still paints every frame.
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotMode = shotName ? applyShot(world, shotName) : false;
if (shotMode && shotName === 'start') world.demo = true;

function upgradeCardAt(mx, my) {
  if (world.state !== STATES.UPGRADE) return -1;
  const cards = world.upgradeChoices;
  const cw = 300;
  const ch = 190;
  const gap = 28;
  const total = cards.length * cw + (cards.length - 1) * gap;
  let x = 640 - total / 2;
  const y = 230;
  for (let i = 0; i < cards.length; i++) {
    if (mx >= x && mx <= x + cw && my >= y && my <= y + ch) return i;
    x += cw + gap;
  }
  return -1;
}

function handleTransitions() {
  // First gesture unlocks audio.
  if (input.mouseClicked || input.pressed.size > 0) audio.ensure();
  if (input.wasPressed('KeyM')) audio.toggleMute();

  if (world.state === STATES.TITLE) {
    if (input.mouseClicked || input.wasPressed('Enter') || input.wasPressed('Space')) {
      world.startRun();
    }
    return;
  }
  if (world.state === STATES.PLAY) {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) world.togglePause();
    return;
  }
  if (world.state === STATES.PAUSED) {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.mouseClicked) world.togglePause();
    if (input.wasPressed('KeyR')) world.startRun();
    return;
  }
  if (world.state === STATES.UPGRADE) {
    if (input.wasPressed('Digit1')) world.pickUpgrade(0);
    else if (input.wasPressed('Digit2')) world.pickUpgrade(1);
    else if (input.wasPressed('Digit3')) world.pickUpgrade(2);
    else if (input.mouseClicked) {
      const idx = upgradeCardAt(input.mouseX, input.mouseY);
      if (idx >= 0) world.pickUpgrade(idx);
    }
    return;
  }
  if (world.state === STATES.OVER) {
    if (input.wasPressed('KeyR') || input.mouseClicked || input.wasPressed('Enter')) {
      world.startRun();
    }
    return;
  }
  if (world.state === STATES.WIN) {
    if (input.wasPressed('KeyR') || input.wasPressed('Enter')) world.startRun();
    else if (input.wasPressed('KeyC')) {
      // Continue into endless mode after the victory.
      world.state = STATES.PLAY;
      world.beginWave(world.wave + 1);
    }
    return;
  }
}

let last = performance.now();
let acc = 0;
function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  handleTransitions();
  if (!shotMode) {
    acc += elapsed;
    let steps = 0;
    while (acc >= FIXED_DT && steps < 5) {
      world.update(FIXED_DT, input);
      acc -= FIXED_DT;
      steps += 1;
    }
    if (steps === 5) acc = 0;
  } else if (shotName === 'start') {
    // Title shot: let the demo drift behind the title so it looks alive.
    acc += elapsed;
    let steps = 0;
    while (acc >= FIXED_DT && steps < 5) {
      world.update(FIXED_DT, input);
      acc -= FIXED_DT;
      steps += 1;
    }
    if (steps === 5) acc = 0;
  }
  renderer.render(world, input);
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Expose the world for debugging in the browser console.
window.__emberline = { world, input, audio };
