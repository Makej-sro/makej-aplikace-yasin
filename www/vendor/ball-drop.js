/**
 * BallDrop — vanilla JS, no dependencies.
 * A basketball hoop. Click it: a basketball drops from above, through the rim and down
 * the net (the net gives a little swish), and exits the bottom. Resets afterwards.
 * The ball sits behind the hoop artwork, so it shows through the net strings.
 *
 *   const b = new BallDrop({ stage: el, ball: el, hoop: el }, { dur: 1.2, s: 30 });
 *   b.shoot();  b.destroy();
 */
class BallDrop {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({ dur: 1.2, s: 30, interactive: true }, options);
    this.anim = null;
    this.reset();
    if (this.o.interactive && this.stage) {
      this._tap = () => this.shoot();
      this.stage.addEventListener('click', this._tap);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._tap && this.stage) this.stage.removeEventListener('click', this._tap);
  }

  reset() {
    if (this.ball) { this.ball.style.opacity = 0; this.ball.style.transform = 'translateY(-60px)'; }
    if (this.hoop) this.hoop.style.transform = 'scaleY(1)';
  }

  shoot() {
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
    const s = this.o.s;

    // ball: falls from above, accelerating (gravity), through the rim and net, out the bottom
    const p = clamp(t / 0.85);
    const startY = -0.55 * s, endY = 1.15 * s;
    const y = startY + (endY - startY) * (p * p);
    if (this.ball) {
      this.ball.style.opacity = (t > 0.02 && p < 1 ? 1 : 0).toFixed(3);
      this.ball.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
    }

    // net swish: a short downward stretch while the ball is passing through the net
    if (this.hoop) {
      const ny = y / s;
      let stretch = 0;
      if (ny > 0.35 && ny < 0.95) stretch = Math.sin(((ny - 0.35) / 0.6) * Math.PI) * 0.07;
      this.hoop.style.transform = 'scaleY(' + (1 + stretch).toFixed(3) + ')';
    }
  }
}

if (typeof module !== 'undefined') module.exports = { BallDrop };
if (typeof window !== 'undefined') window.BallDrop = BallDrop;
