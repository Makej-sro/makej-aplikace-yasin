/**
 * TrainSmoke — vanilla JS, no dependencies.
 * A toy-train icon (one untouched image). Click it: smoke puffs rise out of the
 * chimney top for ~1.5-2 s, expanding, drifting sideways and fading, while the
 * train gently throbs. Everything resets afterwards.
 *
 *   const smoke = new TrainSmoke({
 *     stage: document.querySelector('#stage'),
 *     train: document.querySelector('#train'),
 *     smoke: document.querySelector('#smoke'),   // container of 28 round divs
 *   }, { duration: 1.5, rate: 12, rise: 1.2 });
 *   smoke.puff();  smoke.destroy();
 */
class TrainSmoke {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({
      duration: 1.5,               // s of stoking
      rate: 12,                    // puffs per second
      rise: 1.2,                   // rise-speed multiplier
      chimney: { x: 345, y: 146 }, // chimney mouth in stage px
      interactive: true,
    }, options);
    this.pool = [];
    const n = this.smoke ? this.smoke.children.length : 0;
    for (let i = 0; i < n; i++) this.pool.push({ life: 0, ttl: 0, x: 0, y: 0, vx: 0, vy: 0, sc: 1, grow: 1, seed: Math.random() * 9 });
    this.anim = null;
    this.reset();
    if (this.o.interactive && this.stage) {
      this._tap = () => this.puff();
      this.stage.addEventListener('click', this._tap);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._tap && this.stage) this.stage.removeEventListener('click', this._tap);
  }

  reset() {
    if (this.train) this.train.style.transform = 'translateY(0px)';
    if (this.smoke) for (const el of this.smoke.children) el.style.opacity = 0;
    for (const p of this.pool) { p.life = 0; p.ttl = 0; }
  }

  puff() {
    this.reset();
    this.anim = { start: performance.now() / 1000, dur: this.o.duration + 1.4 };
    this.run();
  }

  run() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.last = 0;
    const loop = (t) => {
      const A = this.anim;
      if (!A) { this.raf = 0; return; }
      const now = t / 1000;
      const dt = Math.min(0.04, this.last ? now - this.last : 0.016);
      this.last = now;
      const el = now - A.start;
      this.tick(el, dt);
      if (el >= A.dur) { this.anim = null; this.raf = 0; this.reset(); return; }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  tick(t, dt) {
    const { duration, rate, rise, chimney } = this.o;
    // emit from the chimney top while the fire is on
    if (t < duration) {
      this.emit = (this.emit || 0) + dt * rate;
      while (this.emit >= 1) {
        this.emit -= 1;
        const p = this.pool.find((q) => q.life >= q.ttl);
        if (!p) break;
        p.x = chimney.x + (Math.random() - 0.5) * 16;
        p.y = chimney.y - Math.random() * 4;
        p.vx = 6 + Math.random() * 30;
        p.vy = -(80 + Math.random() * 60) * rise;
        p.sc = 0.5 + Math.random() * 0.45;
        p.grow = 1.6 + Math.random() * 1.2;
        p.ttl = 1.3 + Math.random() * 0.6;
        p.life = 0;
        p.seed = Math.random() * 9;
      }
    }
    let i = 0;
    if (this.smoke) for (const el of this.smoke.children) {
      const p = this.pool[i++];
      if (!p || p.life >= p.ttl) { el.style.opacity = 0; continue; }
      p.life += dt;
      p.vy *= Math.pow(0.72, dt);                                  // the rise slows down
      p.x += (p.vx + Math.sin(p.life * 3 + p.seed) * 16) * dt;     // lazy sideways curl
      p.y += p.vy * dt;
      const k = p.life / p.ttl;
      el.style.opacity = (Math.min(1, (1 - k) * 1.8) * 0.9).toFixed(3);
      el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) +
        'px) scale(' + (p.sc + p.grow * k).toFixed(3) + ')';
    }
    // train throbs while stoking, then settles
    if (this.train) {
      const on = t < duration ? 1 : Math.max(0, 1 - (t - duration) / 0.5);
      this.train.style.transform = 'translateY(' + (Math.sin(t * 14) * 1.1 * on).toFixed(2) + 'px)';
    }
  }
}

if (typeof module !== 'undefined') module.exports = { TrainSmoke };
if (typeof window !== 'undefined') window.TrainSmoke = TrainSmoke;
