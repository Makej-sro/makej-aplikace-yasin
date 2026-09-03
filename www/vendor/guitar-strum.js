/**
 * GuitarStrum — vanilla JS, no dependencies.
 * An electric-guitar icon. Click it: the whole guitar gives a quick strum wobble, the
 * strings along the neck vibrate (decaying), and musical notes float up out of the body.
 * Everything resets after ~1.7 s.
 *
 *   const g = new GuitarStrum({
 *     stage: el, guitar: el, strings: [el, ...], notes: [el, ...],
 *   }, { dur: 1.7, s: 28 });
 *   g.strum();  g.destroy();
 */
class GuitarStrum {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({ dur: 1.7, s: 28, interactive: true }, options);
    this.pool = [];
    const n = this.notes ? this.notes.length : 0;
    for (let i = 0; i < n; i++) this.pool.push({ life: 0, ttl: 0, x: 0, y: 0, vx: 0, vy: 0, sc: 1, seed: i * 1.7 });
    this.anim = null;
    this.reset();
    if (this.o.interactive && this.stage) {
      this._tap = () => this.strum();
      this.stage.addEventListener('click', this._tap);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._tap && this.stage) this.stage.removeEventListener('click', this._tap);
  }

  reset() {
    if (this.guitar) this.guitar.style.transform = 'rotate(0deg)';
    if (this.strings) for (const s of this.strings) s.style.transform = 'translateY(0px)';
    if (this.notes) for (const el of this.notes) el.style.opacity = 0;
    for (const p of this.pool) { p.life = 0; p.ttl = 0; }
  }

  strum() {
    this.reset();
    this.anim = { start: performance.now() / 1000, dur: this.o.dur };
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
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const s = this.o.s;

    // 1) strum wobble of the whole guitar (decays over 0.7 s)
    if (this.guitar) {
      const e = Math.max(0, 1 - t / 0.7);
      this.guitar.style.transform = 'rotate(' + (Math.sin(t * 42) * 3 * e).toFixed(2) + 'deg)';
    }

    // 2) strings vibrate perpendicular to the neck (decays over 0.85 s), each string its own phase
    if (this.strings) {
      const e = Math.max(0, 1 - t / 0.85);
      const amp = 0.05 * s;
      for (let i = 0; i < this.strings.length; i++) {
        const y = Math.sin(t * 66 + i * 1.5) * amp * e;
        this.strings[i].style.transform = 'translateY(' + y.toFixed(2) + 'px)';
      }
    }

    // 3) notes float up out of the body
    if (t < 0.9) {
      this.emit = (this.emit || 0) + dt * 5;                 // ~5 notes/s
      while (this.emit >= 1) {
        this.emit -= 1;
        const p = this.pool.find((q) => q.life >= q.ttl);
        if (!p) break;
        p.x = 0.30 * s + (Math.random() - 0.5) * 0.12 * s;   // from the body / pickups
        p.y = 0.55 * s;
        p.vx = (6 + Math.random() * 14);                     // drift right
        p.vy = -(34 + Math.random() * 22);                   // rise
        p.sc = 0.85 + Math.random() * 0.5;
        p.ttl = 1.0 + Math.random() * 0.5;
        p.life = 0;
        p.seed = Math.random() * 9;
      }
    }
    if (this.notes) {
      let i = 0;
      for (const el of this.notes) {
        const p = this.pool[i++];
        if (!p || p.life >= p.ttl) { el.style.opacity = 0; continue; }
        p.life += dt;
        p.x += (p.vx + Math.sin(p.life * 4 + p.seed) * 10) * dt;   // sideways sway
        p.y += p.vy * dt;
        const k = p.life / p.ttl;
        el.style.opacity = (Math.min(1, k * 6) * Math.pow(1 - k, 0.9)).toFixed(3);
        el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) rotate(' +
          (Math.sin(p.life * 2.5 + p.seed) * 14).toFixed(1) + 'deg) scale(' + (p.sc * (0.7 + 0.4 * k)).toFixed(3) + ')';
      }
    }
  }
}

if (typeof module !== 'undefined') module.exports = { GuitarStrum };
if (typeof window !== 'undefined') window.GuitarStrum = GuitarStrum;
