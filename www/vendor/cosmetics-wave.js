/**
 * CosmeticsWave — vanilla JS, no dependencies.
 * A makeup icon (mirror + lipstick + brush) split into 3 vertical windows.
 * Click it: the three items hop in sequence (a little Mexican wave), then a
 * shine sweeps across the mirror glass. Everything resets after ~1.5 s.
 *
 *   const w = new CosmeticsWave({
 *     stage:  el, strips: [elA, elB, elC], glint: el, streak: el,
 *   }, { dur: 1.5 });
 *   w.wave();  w.destroy();
 */
class CosmeticsWave {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({ dur: 1.5, interactive: true }, options);
    this.anim = null;
    this.reset();
    if (this.o.interactive && this.stage) {
      this._tap = () => this.wave();
      this.stage.addEventListener('click', this._tap);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._tap && this.stage) this.stage.removeEventListener('click', this._tap);
  }

  reset() {
    if (this.strips) for (const s of this.strips) s.style.transform = 'translateY(0%) scaleY(1)';
    if (this.glint) this.glint.style.opacity = 0;
    if (this.streak) this.streak.style.transform = 'translateX(-160%) skewX(-18deg)';
  }

  wave() {
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

    // 1) Mexican wave — each item hops once, staggered by 0.09 s
    if (this.strips) {
      for (let i = 0; i < this.strips.length; i++) {
        const d = t - i * 0.09;
        const p = clamp(d / 0.42);
        const hop = d < 0 || p >= 1 ? 0 : Math.sin(p * Math.PI);   // 0 -> 1 -> 0
        const y = -20 * hop;                                        // % of own height, up
        const sy = 1 + 0.06 * hop;                                  // slight stretch at apex
        this.strips[i].style.transform = 'translateY(' + y.toFixed(2) + '%) scaleY(' + sy.toFixed(3) + ')';
      }
    }

    // 2) shine sweeps across the mirror glass near the end
    const g = t - 0.62;
    if (this.glint && this.streak) {
      const gp = clamp(g / 0.6);
      const op = g < 0 || gp >= 1 ? 0 : Math.sin(gp * Math.PI);     // fade in then out
      this.glint.style.opacity = op.toFixed(3);
      this.streak.style.transform = 'translateX(' + (-160 + 320 * gp).toFixed(1) + '%) skewX(-18deg)';
    }
  }
}

if (typeof module !== 'undefined') module.exports = { CosmeticsWave };
if (typeof window !== 'undefined') window.CosmeticsWave = CosmeticsWave;
