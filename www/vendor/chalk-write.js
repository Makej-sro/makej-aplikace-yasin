/**
 * ChalkWrite — vanilla JS, no dependencies.
 * A chalkboard. Click it: a chalk "1" draws itself stroke-by-stroke on the board,
 * holds for a moment, then fades away (wiped). Resets afterwards.
 * Works on any SVG <path>; the stroke is revealed via stroke-dashoffset.
 *
 *   const w = new ChalkWrite({ stage: el, path: pathEl }, { dur: 1.6 });
 *   w.write();  w.destroy();
 */
class ChalkWrite {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({ dur: 1.6, interactive: true }, options);
    this.L = this.path ? this.path.getTotalLength() : 100;
    if (this.path) { this.path.style.strokeDasharray = this.L; }
    this.anim = null;
    this.reset();
    if (this.o.interactive && this.stage) {
      this._tap = () => this.write();
      this.stage.addEventListener('click', this._tap);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._tap && this.stage) this.stage.removeEventListener('click', this._tap);
  }

  reset() {
    if (this.path) { this.path.style.strokeDashoffset = this.L; this.path.style.opacity = 1; }
  }

  write() {
    this.reset();
    this.anim = { start: performance.now() / 1000, dur: this.o.dur };
    this.run();
  }

  run() {
    if (this.raf) cancelAnimationFrame(this.raf);
    const loop = (t) => {
      const A = this.anim;
      if (!A) { this.raf = 0; return; }
      const el = t / 1000 - A.start;
      this.tick(el);
      if (el >= A.dur) { this.anim = null; this.raf = 0; this.reset(); return; }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  tick(t) {
    const clamp = (v) => Math.max(0, Math.min(1, v));
    if (!this.path) return;
    // draw at a steady pace (linear) over ~1 s (part by part: háček -> svislá), hold, then fade
    const draw = clamp(t / 1.0);
    this.path.style.strokeDashoffset = (this.L * (1 - draw)).toFixed(2);
    const fadeStart = this.o.dur - 0.3;
    this.path.style.opacity = (t < fadeStart ? 1 : Math.max(0, 1 - (t - fadeStart) / 0.3)).toFixed(3);
  }
}

if (typeof module !== 'undefined') module.exports = { ChalkWrite };
if (typeof window !== 'undefined') window.ChalkWrite = ChalkWrite;
