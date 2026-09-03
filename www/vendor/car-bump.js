/**
 * CarBump — vanilla JS, no dependencies.
 * A car sits in the middle. Click it: another car drives in from the right (from behind),
 * rams the resident car, which is knocked off to the left; the newcomer settles in the
 * middle and becomes the new resident. Endless — every click repeats with the roles swapped.
 *
 *   const car = new CarBump({ stage: el, carA: el, carB: el }, { dur: 1.0, s: 30 });
 *   car.bump();  car.destroy();
 */
class CarBump {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({ dur: 1.0, s: 30, interactive: true }, options);
    this.residentIsA = true;
    this.anim = null;
    this.place();
    if (this.o.interactive && this.stage) {
      this._tap = () => this.bump();
      this.stage.addEventListener('click', this._tap);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._tap && this.stage) this.stage.removeEventListener('click', this._tap);
  }

  // park the cars at rest: resident in the middle, the other waiting off to the right
  place() {
    const R = 1.3 * this.o.s;
    this._res = this.residentIsA ? this.carA : this.carB;
    this._inc = this.residentIsA ? this.carB : this.carA;
    if (this._res) this._res.style.transform = 'translate(0px,0px)';
    if (this._inc) this._inc.style.transform = 'translate(' + R + 'px,0px)';
  }

  reset() { this.place(); }

  bump() {
    if (this.anim) return;                       // ignore clicks mid-animation
    this.anim = { start: performance.now() / 1000, dur: this.o.dur, res: this._res, inc: this._inc };
    this.run();
  }

  run() {
    if (this.raf) cancelAnimationFrame(this.raf);
    const loop = (t) => {
      const A = this.anim;
      if (!A) { this.raf = 0; return; }
      const el = t / 1000 - A.start;
      this.tick(el);
      if (el >= A.dur) {
        this.raf = 0; this.anim = null;
        this.residentIsA = !this.residentIsA;    // newcomer is now the resident
        this.place();
        return;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  tick(t) {
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const easeIn = (x) => x * x;
    const easeOut = (x) => 1 - (1 - x) * (1 - x);
    const s = this.o.s;
    const R = 1.3 * s;          // park / launch distance (off-screen)
    const C = 0.66 * s;         // contact offset — newcomer's nose meets resident's tail
    const impact = 0.42;        // trochu pomalejší přílet druhého auta

    // impact shake (both cars jolt briefly at the crash)
    let shk = 0;
    if (t >= impact && t < impact + 0.12) shk = Math.sin((t - impact) * 150) * 0.05 * s * (1 - (t - impact) / 0.12);

    // newcomer: charges in fast (R -> C, accelerating), a hard recoil at contact, then rolls into the spot
    let xin;
    if (t < impact) { xin = R + (C - R) * easeIn(clamp(t / impact)); }
    else {
      const d = t - impact;
      if (d < 0.09) xin = C + 0.09 * s * (d / 0.09);                 // recoil back a hair
      else xin = (C + 0.09 * s) * (1 - easeOut(clamp((d - 0.09) / 0.55)));   // settle to centre
    }
    if (this.anim.inc) this.anim.inc.style.transform = 'translate(' + xin.toFixed(1) + 'px,' + shk.toFixed(2) + 'px)';

    // resident: waits, then is launched off to the left (fast start, easeOut)
    let xres = 0;
    if (t >= impact) xres = -R * easeOut(clamp((t - impact) / 0.5));
    if (this.anim.res) this.anim.res.style.transform = 'translate(' + xres.toFixed(1) + 'px,' + (shk * 0.6).toFixed(2) + 'px)';
  }
}

if (typeof module !== 'undefined') module.exports = { CarBump };
if (typeof window !== 'undefined') window.CarBump = CarBump;
