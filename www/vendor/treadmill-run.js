/**
 * TreadmillRun — vanilla JS, no dependencies.
 * A person on a treadmill. Click it: they speed up into a run, hold, then gradually slow
 * down and stop (~2 s). The figure bounces with the running cadence and belt speed-lines
 * sweep underneath, both scaling with the current speed. Resets afterwards.
 *
 *   const r = new TreadmillRun({ stage: el, runner: el, lines: [el, ...] }, { dur: 2.1, s: 30 });
 *   r.go();  r.destroy();
 */
class TreadmillRun {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({ dur: 2.1, s: 30, interactive: true }, options);
    this.anim = null;
    this.phase = 0;
    this.belt = 0;
    this.reset();
    if (this.o.interactive && this.stage) {
      this._tap = () => this.go();
      this.stage.addEventListener('click', this._tap);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._tap && this.stage) this.stage.removeEventListener('click', this._tap);
  }

  reset() {
    if (this.runner) this.runner.style.transform = 'translate(0px,0px)';
    if (this.lines) for (const l of this.lines) l.style.opacity = 0;
  }

  // speed profile: ramp up, hold, then slow to a stop over the run
  speed(t, D) {
    if (t < 0.3) return (t / 0.3) * (2 - t / 0.3);          // ease-out up to 1
    if (t < 0.8) return 1;                                   // full speed
    const p = Math.max(0, Math.min(1, (t - 0.8) / (D - 0.9)));
    return 1 - p * p;                                        // decelerate to 0
  }

  go() {
    this.reset();
    this.phase = 0; this.belt = 0;
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
    const s = this.o.s;
    const v = this.speed(t, this.o.dur);

    // jen PÁS běží — postava zůstává v klidu. Čárky sviští po pásu doleva (směr běhu pásu),
    // rychlost i viditelnost sledují aktuální rychlost v (rozjezd -> zpomalení -> stop).
    this.belt += v * dt;
    if (this.lines) {
      for (let i = 0; i < this.lines.length; i++) {
        const l = this.lines[i];
        const pos = (((this.belt * 2.4) + i * 0.27) % 1 + 1) % 1;    // 0..1 loop
        const x = (0.9 - 1.7 * pos) * s;                              // right -> left
        l.style.opacity = (v * 0.85).toFixed(3);
        l.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
      }
    }
  }
}

if (typeof module !== 'undefined') module.exports = { TreadmillRun };
if (typeof window !== 'undefined') window.TreadmillRun = TreadmillRun;
