/**
 * HeartPop — vanilla JS, no dependencies.
 * Heart-shaped hands. Click it: a red heart appears in the hollow (pops in with a bounce,
 * beats), then bursts like a balloon — a quick inflate + fade with shards flying outward.
 * Resets afterwards.
 *
 *   const h = new HeartPop({ stage: el, heart: el, shards: [el, ...] }, { dur: 1.6, s: 30 });
 *   h.pop();  h.destroy();
 */
class HeartPop {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({ dur: 1.6, s: 30, interactive: true }, options);
    this.anim = null;
    this.reset();
    if (this.o.interactive && this.stage) {
      this._tap = () => this.pop();
      this.stage.addEventListener('click', this._tap);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._tap && this.stage) this.stage.removeEventListener('click', this._tap);
  }

  reset() {
    if (this.heart) { this.heart.style.opacity = 0; this.heart.style.transform = 'scale(0)'; }
    if (this.shards) for (const sh of this.shards) { sh.style.opacity = 0; sh.style.transform = 'translate(0px,0px) scale(1)'; }
  }

  pop() {
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
    const easeOut = (x) => 1 - Math.pow(1 - x, 3);
    const backOut = (p) => { const c = 2.2; const q = p - 1; return 1 + (c + 1) * q * q * q + c * q * q; };
    const s = this.o.s;
    const POP = 1.0;   // when the heart bursts

    if (t < POP) {
      // pop in with an overshoot, then a gentle heartbeat
      let sc;
      if (t < 0.35) sc = backOut(clamp(t / 0.35));
      else sc = 1 + 0.07 * Math.sin((t - 0.35) * 9);
      if (this.heart) { this.heart.style.opacity = 1; this.heart.style.transform = 'scale(' + Math.max(0, sc).toFixed(3) + ')'; }
    } else {
      const d = t - POP;
      // heart: quick inflate then vanish (the "pop")
      const k = clamp(d / 0.13);
      if (this.heart) { this.heart.style.opacity = (1 - k).toFixed(3); this.heart.style.transform = 'scale(' + (1 + 0.7 * k).toFixed(3) + ')'; }
      // shards fly outward and fade
      const kk = clamp(d / 0.42);
      if (this.shards) {
        const n = this.shards.length;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2;
          const dist = 0.52 * s * easeOut(kk);
          const x = Math.cos(ang) * dist, y = Math.sin(ang) * dist;
          this.shards[i].style.opacity = (1 - kk).toFixed(3);
          this.shards[i].style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + (1 - 0.5 * kk).toFixed(3) + ')';
        }
      }
    }
  }
}

if (typeof module !== 'undefined') module.exports = { HeartPop };
if (typeof window !== 'undefined') window.HeartPop = HeartPop;
