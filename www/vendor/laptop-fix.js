/**
 * LaptopFix — vanilla JS, no dependencies.
 * A laptop icon showing a blue error screen. Click it: the screen crossfades to a dark
 * loading state with a spinning ring, then to a white screen with a green check mark,
 * holds, and returns to the error screen.
 *
 *   const fix = new LaptopFix({
 *     stage: document.querySelector('#stage'),
 *     bsod:  document.querySelector('#bsod'),
 *     load:  document.querySelector('#load'),
 *     done:  document.querySelector('#done'),
 *     spin:  document.querySelector('#spin'),
 *     check: document.querySelector('#check'),
 *   }, { loading: 1.4, hold: 1.3, spin: 1.4 });
 *   fix.fix();  fix.destroy();
 */
class LaptopFix {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({
      loading: 1.4,   // s the spinner runs
      hold: 1.3,      // s the check stays
      spin: 1.4,      // s per spinner revolution
      interactive: true,
    }, options);
    this.anim = null;
    this.reset();
    if (this.o.interactive && this.stage) {
      this._tap = () => this.fix();
      this.stage.addEventListener('click', this._tap);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._tap && this.stage) this.stage.removeEventListener('click', this._tap);
  }

  set(el, op) { if (el) el.style.opacity = op.toFixed(3); }

  reset() {
    this.set(this.bsod, 1);
    this.set(this.load, 0);
    this.set(this.done, 0);
    this.set(this.check, 0);
    if (this.spin) this.spin.style.transform = 'rotate(0deg)';
    if (this.check) this.check.style.transform = 'rotate(-45deg) scale(0.2)';
  }

  fix() {
    this.reset();
    const { loading, hold } = this.o;
    this.anim = { start: performance.now() / 1000, loading, hold,
                  dur: 0.22 + loading + 0.24 + hold + 0.3 };
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
    const tLoadIn = 0.22;                          // error -> loading crossfade
    const tLoadEnd = tLoadIn + A.loading;          // loading ends
    const tDoneEnd = tLoadEnd + 0.24 + A.hold;     // check stops being held

    const loadOn = clamp(t / tLoadIn) * (1 - clamp((t - tLoadEnd) / 0.24));
    const doneOn = clamp((t - tLoadEnd) / 0.24) * (1 - clamp((t - tDoneEnd) / 0.3));
    this.set(this.load, loadOn);
    this.set(this.done, doneOn);
    this.set(this.bsod, 1 - Math.max(loadOn, doneOn) * 0.999);

    if (this.spin) this.spin.style.transform = 'rotate(' + ((t / this.o.spin) * 360).toFixed(1) + 'deg)';

    if (this.check) {
      const p = clamp((t - tLoadEnd - 0.05) / 0.42);
      // overshoot then settle
      const pop = p < 1 ? 1.15 * (1 - Math.pow(1 - p, 3)) - 0.15 * Math.sin(p * Math.PI * 1.2) * (1 - p) : 1;
      this.check.style.transform = 'rotate(-45deg) scale(' + Math.max(0.2, pop).toFixed(3) + ')';
      this.set(this.check, clamp((t - tLoadEnd - 0.05) / 0.16) * (1 - clamp((t - tDoneEnd) / 0.3)));
    }
  }
}

if (typeof module !== 'undefined') module.exports = { LaptopFix };
if (typeof window !== 'undefined') window.LaptopFix = LaptopFix;
