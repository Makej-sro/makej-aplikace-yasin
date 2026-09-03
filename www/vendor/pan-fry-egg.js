/**
 * PanFryEgg — vanilla JS, no dependencies.
 * An empty pan. Click it: a whole egg drops in from above, the pan takes the hit,
 * and the egg spreads into the fried egg with a small overshoot. Resets after a hold.
 *
 *   const fry = new PanFryEgg({
 *     stage: document.querySelector('#stage'),
 *     pan:   document.querySelector('#pan'),
 *     fried: document.querySelector('#fried'),
 *     raw:   document.querySelector('#raw'),
 *   }, { fall: 0.45, hold: 1.1 });
 *   fry.cook();  fry.destroy();
 */
class PanFryEgg {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({
      fall: 0.45,      // s the egg falls
      hold: 1.1,       // s the fried egg stays before reset
      dropFrom: -220,  // px above its resting spot the egg starts
      interactive: true,
    }, options);
    this.anim = null;
    this.reset();
    if (this.o.interactive && this.stage) {
      this._tap = () => this.cook();
      this.stage.addEventListener('click', this._tap);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._tap && this.stage) this.stage.removeEventListener('click', this._tap);
  }

  reset() {
    if (this.pan) this.pan.style.transform = 'translateY(0px)';
    if (this.fried) { this.fried.style.opacity = 0; this.fried.style.transform = 'scale(0.25)'; }
    if (this.raw) {
      this.raw.style.opacity = 0;
      this.raw.style.transform = 'translateY(' + this.o.dropFrom + 'px) rotate(-8deg)';
    }
  }

  cook() {
    this.reset();
    const { fall, hold } = this.o;
    this.anim = { start: performance.now() / 1000, fall, hold, dur: fall + 0.55 + hold + 0.45 };
    this.run();
  }

  run() {
    if (this.raf) cancelAnimationFrame(this.raf);
    const loop = (t) => {
      const A = this.anim;
      if (!A) { this.raf = 0; return; }
      const el = t / 1000 - A.start;
      this.tick(el, A);
      if (el >= A.dur) { this.anim = null; this.raf = 0; this.reset(); return; }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  tick(t, A) {
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const land = A.fall;          // impact
    const spread = 0.55;          // s to spread into the fried egg
    const H = this.o.dropFrom;

    // whole egg falls, accelerating (p² = gravity), tumbling slightly
    if (this.raw) {
      const p = clamp(t / land);
      this.raw.style.opacity = t < land - 0.005 ? 1 : 0;
      this.raw.style.transform = 'translateY(' + (H - H * p * p).toFixed(1) +
        'px) rotate(' + (-8 + 26 * p).toFixed(1) + 'deg)';
    }

    // fried egg grows from the impact point with a squash-and-settle overshoot
    if (this.fried) {
      const p = clamp((t - land) / spread);
      const e = 1 - Math.pow(1 - p, 3);
      const s = p < 1 ? 0.25 + 0.87 * e + 0.1 * Math.sin(p * Math.PI) : 1;
      const sx = s * (1 + 0.12 * Math.sin(p * Math.PI) * (1 - p));
      const sy = s * (1 - 0.14 * Math.sin(p * Math.PI) * (1 - p));
      this.fried.style.opacity = clamp((t - land) / 0.08).toFixed(3);
      this.fried.style.transform = 'scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';
    }

    // pan bounces once under the impact
    if (this.pan) {
      const d = t - land;
      const k = d > 0 && d < 0.3 ? Math.sin(d / 0.3 * Math.PI * 2) * 4 * (1 - d / 0.3) : 0;
      this.pan.style.transform = 'translateY(' + k.toFixed(2) + 'px)';
    }
  }
}

if (typeof module !== 'undefined') module.exports = { PanFryEgg };
if (typeof window !== 'undefined') window.PanFryEgg = PanFryEgg;
