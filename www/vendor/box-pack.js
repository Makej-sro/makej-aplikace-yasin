/**
 * BoxPack — vanilla JS, no dependencies.
 * A moving box. Click it: the box zooms off to the right, disappears, and reappears from
 * the left (like it went through a teleport / wrapped around), with manga-style speed lines
 * trailing behind it while it moves. Resets after ~1.3 s.
 *
 *   const box = new BoxPack({ stage: el, box: el, lines: [el, el, ...] }, { dur: 1.3, s: 24 });
 *   box.pack();  box.destroy();
 */
class BoxPack {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({ dur: 1.3, s: 24, interactive: true }, options);
    this.anim = null;
    this.reset();
    if (this.o.interactive && this.stage) {
      this._tap = () => this.pack();
      this.stage.addEventListener('click', this._tap);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._tap && this.stage) this.stage.removeEventListener('click', this._tap);
  }

  reset() {
    if (this.box) this.box.style.transform = 'translateX(0px) rotate(0deg)';
    if (this.lines) for (const l of this.lines) l.style.opacity = 0;
  }

  pack() {
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
    const easeIn = (x) => x * x;
    const easeOut = (x) => 1 - (1 - x) * (1 - x);
    const s = this.o.s, OUT = 1.4 * s;

    // box: zoom out to the right, disappear, then reappear from the LEFT (teleport wrap).
    // Direction of travel stays rightward the whole time, so speed lines always trail left.
    let x = 0, moving = 0, dir = 1;
    if (t < 0.42) { x = OUT * easeIn(clamp(t / 0.42)); moving = 1; dir = 1; }               // exit right (accelerating)
    else if (t < 0.60) { x = OUT; moving = 0; }                                              // off-screen
    else if (t < 1.05) { x = -OUT * (1 - easeOut(clamp((t - 0.60) / 0.45))); moving = 1; dir = 1; }  // enter from left (decelerating)
    else { x = 0; moving = 0; }

    if (this.box) {
      const tilt = moving ? dir * 4 : 0;
      this.box.style.transform = 'translateX(' + x.toFixed(1) + 'px) rotate(' + tilt + 'deg)';
    }

    // speed lines: horizontal streaks that whoosh across in the direction of travel (left -> right),
    // continuously looping while the box moves, each fading in and out across its sweep.
    if (this.lines) {
      const on = moving ? 1 : 0;
      for (let i = 0; i < this.lines.length; i++) {
        const l = this.lines[i];
        const pos = (((t * 2.2) + i * 0.31) % 1);          // 0..1, looping sweep
        const x = (-0.6 + 1.9 * pos) * s;                   // off-left -> off-right
        const fade = Math.sin(pos * Math.PI);               // fade in mid-sweep, out at ends
        l.style.opacity = (on * fade * 0.9).toFixed(3);
        l.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
      }
    }
  }
}

if (typeof module !== 'undefined') module.exports = { BoxPack };
if (typeof window !== 'undefined') window.BoxPack = BoxPack;
