// EMBERLINE — keyboard and mouse state.
// One clear job: turn raw DOM events into the tiny query surface the game
// loop needs (held keys, aim point, clicks), with no game logic inside.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 640;
    this.mouseY = 360;
    this.mouseDown = false;
    this.mouseClicked = false;
    this._onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      this.mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;
    };
    this._onMouseDown = (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
        this.mouseClicked = true;
      }
      this._onMouseMove(e);
    };
    this._onMouseUp = (e) => {
      if (e.button === 0) this.mouseDown = false;
    };
    this._onBlur = () => {
      this.keys.clear();
      this.mouseDown = false;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  // Movement vector from WASD or arrow keys, normalized.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  // True only on the frame the key went down (call once per frame).
  wasPressed(code) {
    return this.pressed.has(code);
  }

  // True while the fire button is held (mouse or Space).
  firing() {
    return this.mouseDown || this.keys.has('Space');
  }

  // Consume the per-frame edge states; call at the end of each update.
  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
  }
}
